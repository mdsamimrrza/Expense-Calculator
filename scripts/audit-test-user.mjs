// One-off audit: compare the test user's entries against the official
// nav_reference series. Prints a per-entry verdict. No secrets printed.
// Run: node scripts/audit-test-user.mjs
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

for (const fund of funds) {
  const fk = fund.fund_name.trim().toLowerCase();
  // Paginate: PostgREST caps a single select at 1000 rows and these
  // funds have full daily histories now.
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

  console.log(`\n=== ${fund.fund_name} ===`);
  console.log(`nav_reference rows: ${navs?.length ?? 0}`);
  if (!navs || navs.length === 0) {
    console.log("NO OFFICIAL HISTORY - cannot audit");
    continue;
  }
  console.log(`official coverage: ${navs[0].nav_date} .. ${navs[navs.length - 1].nav_date}`);

  const navMap = new Map(navs.map((n) => [n.nav_date, Number(n.nav_value)]));
  const dates = navs.map((n) => n.nav_date);

  const { data: entries } = await db
    .from("entries")
    .select("id, purchase_date, amount, nav, units")
    .eq("fund_id", fund.id)
    .order("purchase_date", { ascending: true });

  let match = 0, offNav = 0, noNav = 0;
  for (const e of entries ?? []) {
    // official NAV on the date, else nearest published date BEFORE it
    let official = navMap.get(e.purchase_date);
    if (official === undefined) {
      const prior = dates.filter((d) => d <= e.purchase_date);
      if (prior.length === 0) {
        noNav++;
        console.log(`  ${e.purchase_date}  entry_nav=${e.nav} units=${e.units}  - no official NAV on/before date`);
        continue;
      }
      official = navMap.get(prior[prior.length - 1]);
    }
    const expectedUnits = Math.floor((Number(e.amount) - DP) / official);
    const navOk = Math.abs(official - Number(e.nav)) < 0.005;
    const unitsOk = expectedUnits === Number(e.units);
    if (navOk && unitsOk) {
      match++;
    } else {
      offNav++;
      console.log(
        `  ${e.purchase_date}  entry_nav=${e.nav} units=${e.units}  official=${official} expected_units=${expectedUnits}` +
          (!navOk ? "  [NAV WRONG]" : "") + (!unitsOk ? "  [UNITS WRONG]" : "")
      );
    }
  }
  console.log(`summary: ${match} ok, ${offNav} wrong, ${noNav} no-official-nav`);
}
