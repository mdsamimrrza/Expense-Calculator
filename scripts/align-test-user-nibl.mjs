// One-off fix: the test user's NIBL Sahabhagita fund starts a year of
// entries before NMB and SSIS (2021 vs January 2022 - 70 entries vs 58).
// Deletes the 2021 entries, aligns fund_config.start_date with the other
// funds, and removes the auto-filled dividend rows so the nightly
// dividend sync rebuilds them against the shortened history. The 2021
// dividend will then be skipped permanently ("no units held on record
// date") instead of being rebuilt wrong.
// Run: node scripts/align-test-user-nibl.mjs
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
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env files");
  process.exit(1);
}

const db = createClient(url, key);
const nextAuth = createClient(url, key, { db: { schema: "next_auth" } });

const email = "mdsamimrrza1@gmail.com";
// SSIS starts 2022-01-01, NMB 2022-01-18; NIBL entries fall on the 1st,
// so 2022-01-01 puts it level with the other two.
const NEW_START = "2022-01-01";

const { data: users } = await nextAuth
  .from("users")
  .select("id, email")
  .eq("email", email)
  .limit(1);
if (!users || users.length === 0) {
  console.error("No user found with email:", email);
  process.exit(1);
}
const user = users[0];

const { data: funds } = await db.from("fund_config").select("*").eq("user_id", user.id);
const fund = funds.find(
  (f) => f.fund_name.trim().toLowerCase() === "nibl sahabhagita fund"
);
if (!fund) {
  console.error("NIBL Sahabhagita fund not found for test user");
  process.exit(1);
}

// 1. Entries dated before the new start.
const { data: stale } = await db
  .from("entries")
  .select("id, purchase_date, nav, units")
  .eq("fund_id", fund.id)
  .lt("purchase_date", NEW_START)
  .order("purchase_date", { ascending: true });
console.log(`NIBL entries before ${NEW_START}: ${stale.length}`);
for (const e of stale) console.log(`  - ${e.purchase_date} nav=${e.nav} units=${e.units}`);

const { error: delErr } = await db
  .from("entries")
  .delete()
  .eq("fund_id", fund.id)
  .lt("purchase_date", NEW_START);
if (delErr) {
  console.error("entry delete FAILED:", delErr.message);
  process.exit(1);
}
console.log(`deleted ${stale.length} entries`);

// 2. Align the fund start date.
const { error: sdErr } = await db
  .from("fund_config")
  .update({ start_date: NEW_START })
  .eq("id", fund.id);
console.log(
  sdErr ? `start_date update FAILED: ${sdErr.message}` : `start_date -> ${NEW_START}`
);

// 3. Drop the auto-filled dividends so the cron sync rebuilds them
//    against the shortened entry history.
const { data: divs } = await db
  .from("dividends")
  .select("id, record_date, units_at_record, net_amount")
  .eq("fund_id", fund.id)
  .order("record_date", { ascending: true });
console.log(`dividend rows to remove for rebuild: ${divs.length}`);
for (const d of divs)
  console.log(`  - ${d.record_date} units_at_record=${d.units_at_record} net=${d.net_amount}`);
const { error: divErr } = await db.from("dividends").delete().eq("fund_id", fund.id);
console.log(divErr ? `dividend delete FAILED: ${divErr.message}` : "dividends removed");

// 4. Post-state.
const { count } = await db
  .from("entries")
  .select("id", { count: "exact", head: true })
  .eq("fund_id", fund.id);
console.log(`NIBL entries remaining: ${count}`);
