// One-off repro: replicate src/lib/actions/dashboard.ts chart math with
// the test user's real data to explain the end-of-chart portfolio spike.
// Prints monthly portfolio value samples, the largest day-over-day jumps,
// and per-fund last-known NAV at the jump points.
// Run: node scripts/repro-portfolio-chart.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  for (const file of [".env.local", ".env"]) {
    try {
      const line = readFileSync(file, "utf8")
        .split("\n")
        .find((l) => l.startsWith(key + "="));
      if (line) return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
    } catch {}
  }
  return undefined;
}

const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
const key = env("SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(url, key);
const nextAuth = createClient(url, key, { db: { schema: "next_auth" } });

const { data: users } = await nextAuth
  .from("users")
  .select("id")
  .eq("email", "mdsamimrrza1@gmail.com")
  .limit(1);
const user = users[0];

const { data: funds } = await db
  .from("fund_config")
  .select("*")
  .eq("user_id", user.id)
  .eq("is_active", true)
  .order("created_at", { ascending: true });

const { data: entries } = await db
  .from("entries")
  .select("id, fund_id, purchase_date, amount, nav, units")
  .eq("user_id", user.id)
  .order("purchase_date", { ascending: true });

const { data: navHistory } = await db
  .from("nav_history")
  .select("fund_id, nav_date, nav_value")
  .eq("user_id", user.id)
  .order("nav_date", { ascending: true });

console.log("=== nav_history (user manual NAV points) ===");
for (const r of navHistory ?? []) console.log(`  ${r.nav_date} fund=${r.fund_id.slice(0, 8)} nav=${r.nav_value}`);
if (!navHistory?.length) console.log("  (none)");

const fundKeyToIds = new Map();
for (const f of funds) {
  const k = f.fund_name.trim().toLowerCase();
  fundKeyToIds.set(k, [...(fundKeyToIds.get(k) ?? []), f.id]);
}

// SAME query as dashboard.ts - no pagination, ascending.
const { data: refData } = await db
  .from("nav_reference")
  .select("fund_key, nav_date, nav_value")
  .in("fund_key", [...fundKeyToIds.keys()])
  .order("nav_date", { ascending: true });
console.log(`\n=== nav_reference rows returned (dashboard query, no pagination): ${refData.length} ===`);
const refLast = {};
for (const r of refData) refLast[r.fund_key] = r.nav_date;
for (const [k, d] of Object.entries(refLast)) console.log(`  ${k}: coverage ends at ${d}`);

// Build the per-fund NAV timeline exactly like the dashboard.
const fundNavTimeline = new Map();
const ensure = (fid) => {
  if (!fundNavTimeline.has(fid)) fundNavTimeline.set(fid, new Map());
  return fundNavTimeline.get(fid);
};
for (const e of entries) ensure(e.fund_id).set(e.purchase_date, Number(e.nav));
for (const row of refData) {
  for (const fid of fundKeyToIds.get(row.fund_key) ?? []) ensure(fid).set(row.nav_date, Number(row.nav_value));
}
for (const row of navHistory ?? []) ensure(row.fund_id).set(row.nav_date, Number(row.nav_value));
for (const f of funds) {
  if (f.latest_nav && f.latest_nav_date) ensure(f.id).set(f.latest_nav_date, Number(f.latest_nav));
}

const timelineDates = Array.from(
  new Set([
    ...entries.map((e) => e.purchase_date),
    ...Array.from(fundNavTimeline.values()).flatMap((m) => Array.from(m.keys())),
  ])
).sort((a, b) => a.localeCompare(b));

const runningUnits = new Map();
const lastNav = new Map();
for (const f of funds) {
  const first = entries
    .filter((e) => e.fund_id === f.id)
    .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))[0];
  if (first) lastNav.set(f.id, Number(first.nav));
  runningUnits.set(f.id, 0);
}
const entriesByDate = new Map();
for (const e of entries) {
  const b = entriesByDate.get(e.purchase_date);
  if (b) b.push(e);
  else entriesByDate.set(e.purchase_date, [e]);
}

const series = [];
let invested = 0;
for (const dt of timelineDates) {
  for (const e of entriesByDate.get(dt) ?? []) {
    runningUnits.set(e.fund_id, (runningUnits.get(e.fund_id) || 0) + Number(e.units));
    invested += Number(e.amount);
  }
  for (const [fid, m] of fundNavTimeline.entries()) {
    if (m.has(dt)) lastNav.set(fid, m.get(dt));
  }
  let pv = 0;
  let tu = 0;
  const navs = {};
  for (const f of funds) {
    const u = runningUnits.get(f.id) || 0;
    const n = lastNav.get(f.id) || 0;
    pv += u * n;
    tu += u;
    navs[f.fund_name.slice(0, 5)] = n;
  }
  if (tu > 0) series.push({ dt, pv, invested, navs });
}

console.log("\n=== monthly samples ===");
let lastMonth = "";
for (const p of series) {
  const mo = p.dt.slice(0, 7);
  if (mo !== lastMonth) {
    lastMonth = mo;
    console.log(`  ${p.dt}  pv=${Math.round(p.pv).toLocaleString()}  invested=${Math.round(p.invested).toLocaleString()}  navs=${JSON.stringify(p.navs)}`);
  }
}

console.log("\n=== top 12 day-over-day jumps in portfolio value ===");
const jumps = [];
for (let i = 1; i < series.length; i++) {
  const d = series[i].pv - series[i - 1].pv;
  if (d > 0) jumps.push({ from: series[i - 1].dt, to: series[i].dt, delta: d, navs: series[i].navs, prevNavs: series[i - 1].navs });
}
jumps.sort((a, b) => b.delta - a.delta);
for (const j of jumps.slice(0, 12))
  console.log(`  ${j.from} -> ${j.to}  +${Math.round(j.delta).toLocaleString()}  navs ${JSON.stringify(j.prevNavs)} -> ${JSON.stringify(j.navs)}`);
