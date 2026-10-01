// One-off inspection: find the test user, their fund and entries.
// Prints only non-secret data. Run: node scripts/inspect-test-user.mjs
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

const email = process.argv[2] || "mdsamimrrza1@gmail.com";

const nextAuth = createClient(url, key, { db: { schema: "next_auth" } });
const db = createClient(url, key);

const { data: users, error: userErr } = await nextAuth
  .from("users")
  .select("id, email, name")
  .eq("email", email)
  .limit(1);

if (userErr) {
  console.error("user lookup error:", userErr.message);
  process.exit(1);
}
if (!users || users.length === 0) {
  console.error("No user found with email:", email);
  process.exit(1);
}

const user = users[0];
console.log("USER:", JSON.stringify(user));

const { data: funds } = await db
  .from("fund_config")
  .select("*")
  .eq("user_id", user.id);
console.log("FUNDS:", JSON.stringify(funds, null, 2));

for (const fund of funds || []) {
  const { data: entries } = await db
    .from("entries")
    .select("id, purchase_date, amount, nav, units")
    .eq("fund_id", fund.id)
    .order("purchase_date", { ascending: true });
  console.log(`\nENTRIES for ${fund.fund_name} (${entries?.length ?? 0}):`);
  for (const e of entries || []) {
    console.log(`  ${e.purchase_date}  amount=${e.amount}  nav=${e.nav}  units=${e.units}`);
  }
  const { data: dividends } = await db
    .from("dividends")
    .select("*")
    .eq("fund_id", fund.id)
    .order("record_date", { ascending: false });
  console.log(`DIVIDENDS for ${fund.fund_name}:`, JSON.stringify(dividends));
}
