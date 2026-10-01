// One-off fix: correct the test user's entries against the official
// nav_reference series, align fund_config.start_date, and remove the
// auto-filled dividend rows so the cron can rebuild them.
// Run: node scripts/fix-test-user.mjs
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

const email = "mdsamimrrza1@gmail.com";
const DP = 5;

const { data: users } = await nextAuth.from("users").select("id").eq("email", email).limit(1);
const user = users[0];
const { data: funds } = await db.from("fund_config").select("*").eq("user_id", user.id);

let fixedNav = 0, fixedUnits = 0;

for (const fund of funds) {
  const fk = fund.fund_name.trim().toLowerCase();
  const navs = [];
  let offset = 0;
  while (true) {
    const { data: page } = await db
      .from("nav_reference")
      .select("nav_date, nav_value")
      .eq("fund_key", fk)
      .order("nav_date", { ascending: true })
      .range(offset, offset + 999);
    if (!page || page.length === 0) break;
    navs.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }
  const navMap = new Map(navs.map((n) => [n.nav_date, Number(n.nav_value)]));
  const dates = navs.map((n) => n.nav_date);

  const { data: entries } = await db
    .from("entries")
    .select("id, purchase_date, amount, nav, units")
    .eq("fund_id", fund.id)
    .order("purchase_date", { ascending: true });

  for (const e of entries ?? []) {
    let official = navMap.get(e.purchase_date);
    if (official === undefined) {
      const prior = dates.filter((d) => d <= e.purchase_date);
      official = prior.length > 0 ? navMap.get(prior[prior.length - 1]) : undefined;
    }
    if (official === undefined) continue;
    const expectedUnits = Math.round(((Number(e.amount) - DP) / official) * 10000) / 10000;
    if (Math.abs(official - Number(e.nav)) < 0.005 && Math.abs(expectedUnits - Number(e.units)) < 0.00005) continue;

    const patch = {};
    if (Math.abs(official - Number(e.nav)) >= 0.005) {
      patch.nav = official;
      fixedNav++;
    }
    if (Math.abs(expectedUnits - Number(e.units)) >= 0.00005) {
      patch.units = expectedUnits;
      fixedUnits++;
    }
    const { error } = await db.from("entries").update(patch).eq("id", e.id);
    console.log(`${error ? "FAILED" : "fixed"} ${e.purchase_date}:`, patch, error?.message ?? "");
  }

  // start_date must equal the first entry date
  const firstDate = (entries ?? [])[0]?.purchase_date;
  if (firstDate && fund.start_date !== firstDate) {
    const { error } = await db.from("fund_config").update({ start_date: firstDate }).eq("id", fund.id);
    console.log(`${fund.fund_name} start_date: ${fund.start_date} -> ${firstDate}${error ? " FAILED: " + error.message : ""}`);
  }

  // latest_nav must match the newest official NAV
  const newest = navs[navs.length - 1];
  if (newest && (Number(fund.latest_nav) !== Number(newest.nav_value) || fund.latest_nav_date !== newest.nav_date)) {
    const { error } = await db
      .from("fund_config")
      .update({ latest_nav: newest.nav_value, latest_nav_date: newest.nav_date })
      .eq("id", fund.id);
    console.log(
      `${fund.fund_name} latest_nav: ${fund.latest_nav}@${fund.latest_nav_date} -> ${newest.nav_value}@${newest.nav_date}${error ? " FAILED: " + error.message : ""}`
    );
  }
}

console.log(`\nnav corrections: ${fixedNav}, unit corrections: ${fixedUnits}`);

// Remove auto-filled dividends so the cron rebuilds them from the
// corrected entries.
const { data: del, error: delErr } = await db
  .from("dividends")
  .delete()
  .like("notes", "Auto-filled%")
  .select("id");
console.log(`auto-filled dividends removed: ${del?.length ?? 0}`, delErr?.message ?? "");
