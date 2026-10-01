// ============================================================
// SahakariSIP - Test-user dividend auto-fill (cron step)
//
// Automatically records verified dividend declarations
// (src/lib/dividend-declarations.ts) for the TEST USER accounts
// listed in AUTO_FILL_EMAILS, so the whole flow - units held on
// the book-closure date, gross, TDS, net - is computed and
// inserted with no manual entry. Real users always record
// dividends themselves via the Tax & Settlement Ledger page.
//
// Deliberately narrow: extend AUTO_FILL_EMAILS one email at a
// time, never silently. Guarded by the UNIQUE (fund_id,
// record_date) constraint, so re-running never duplicates.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { DIVIDEND_DECLARATIONS, normalizeFundName } from "@/lib/dividend-declarations";
import { DIVIDEND_TDS_PCT } from "@/lib/constants";

const AUTO_FILL_EMAILS = ["mdsamimrrza1@gmail.com"];
const FACE_VALUE_PER_UNIT = 10;

interface SyncResult {
  usersMatched: string[];
  inserted: Array<{ fund: string; fiscalYear: string; recordDate: string; net: number }>;
  alreadyRecorded: Array<{ fund: string; recordDate: string }>;
  skipped: Array<{ fund: string; recordDate: string; reason: string }>;
  error?: string;
}

// Minimal structural type: the cron route's client carries narrow schema
// generics we don't need - the queries below are validated at runtime.
type QueryClient = { from: (table: string) => any };

export async function syncTestUserDividends(admin: QueryClient): Promise<SyncResult> {
  const result: SyncResult = {
    usersMatched: [],
    inserted: [],
    alreadyRecorded: [],
    skipped: [],
  };

  try {
    // User ids for the auto-fill accounts (next_auth schema).
    const nextAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "next_auth" } }
    );
    const { data: users, error: usersErr } = await nextAuth
      .from("users")
      .select("id, email")
      .in("email", AUTO_FILL_EMAILS);

    if (usersErr) {
      result.error = `user lookup: ${usersErr.message}`;
      return result;
    }
    if (!users || users.length === 0) {
      return result;
    }
    result.usersMatched = users.map((u) => u.email);

    for (const user of users) {
      const { data: funds, error: fundsErr } = await admin
        .from("fund_config")
        .select("id, fund_name")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (fundsErr) {
        result.error = `fund lookup: ${fundsErr.message}`;
        continue;
      }

      for (const fund of funds ?? []) {
        const key = normalizeFundName(fund.fund_name);
        const declarations = DIVIDEND_DECLARATIONS.filter((d) => d.fundName === key);

        for (const decl of declarations) {
          // Already recorded (manually or by a previous run)? Skip.
          const { data: existing } = await admin
            .from("dividends")
            .select("id")
            .eq("fund_id", fund.id)
            .eq("record_date", decl.recordDate)
            .limit(1);
          if (existing && existing.length > 0) {
            result.alreadyRecorded.push({ fund: fund.fund_name, recordDate: decl.recordDate });
            continue;
          }

          // Units the user held on the book-closure date - what the AMC
          // actually paid against.
          const { data: entries, error: entriesErr } = await admin
            .from("entries")
            .select("units")
            .eq("user_id", user.id)
            .eq("fund_id", fund.id)
            .lte("purchase_date", decl.recordDate);

          if (entriesErr) {
            result.skipped.push({
              fund: fund.fund_name,
              recordDate: decl.recordDate,
              reason: `entries lookup: ${entriesErr.message}`,
            });
            continue;
          }

          const unitsAtRecord = (entries ?? []).reduce(
            (sum: number, e: { units: number }) => sum + Number(e.units),
            0
          );
          if (unitsAtRecord <= 0) {
            result.skipped.push({
              fund: fund.fund_name,
              recordDate: decl.recordDate,
              reason: "no units held on record date",
            });
            continue;
          }

          const perUnit = decl.dividendPct * (FACE_VALUE_PER_UNIT / 100);
          const gross = unitsAtRecord * perUnit;
          const tds = (gross * DIVIDEND_TDS_PCT) / 100;

          const { error: insertErr } = await admin.from("dividends").insert({
            user_id: user.id,
            fund_id: fund.id,
            record_date: decl.recordDate,
            dividend_pct: decl.dividendPct,
            per_unit: perUnit,
            units_at_record: unitsAtRecord,
            gross_amount: gross,
            tds_pct: DIVIDEND_TDS_PCT,
            tds_amount: tds,
            net_amount: gross - tds,
            notes: `Auto-filled from verified declaration, FY ${decl.fiscalYear}`,
          });

          if (insertErr) {
            result.skipped.push({
              fund: fund.fund_name,
              recordDate: decl.recordDate,
              reason: `insert: ${insertErr.message}`,
            });
          } else {
            result.inserted.push({
              fund: fund.fund_name,
              fiscalYear: decl.fiscalYear,
              recordDate: decl.recordDate,
              net: gross - tds,
            });
          }
        }
      }
    }
  } catch (err: any) {
    result.error = err?.message || String(err);
  }

  return result;
}
