// ============================================================
// SahakariSIP - Test-user SIP installment auto-recording (cron step)
//
// Each night, for the TEST USER accounts in AUTO_FILL_EMAILS only,
// walks every REGISTERED SIP schedule (user-confirmed frequency +
// calendar + anchor - never the derived fallback) and records any
// installment whose due date has arrived but has no entry yet:
//   amount = the fund's registered monthly_sip
//   nav    = official NAV on the due date (nearest published before
//            it when that date has no quote, e.g. today before the
//            NAV is out, or a holiday)
//   units  = floor((amount - DP fee) / nav) - the app's convention
//
// Derived (unverified) schedules are skipped on purpose: the popup
// may preview them, but auto-recording from a guess would fabricate
// history. Re-running is safe - a due date with an existing entry is
// skipped.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { resolveSchedule } from "@/lib/sip-schedule";
import { installmentDueDate, nepalTodayAD } from "@/lib/calendar/bs";
import { DP_CHARGE } from "@/lib/constants";
import { roundUnits } from "@/lib/format";
import { normalizeFundName } from "@/lib/dividend-declarations";

const AUTO_FILL_EMAILS = ["mdsamimrrza1@gmail.com"];

interface SyncResult {
  usersMatched: string[];
  inserted: Array<{ fund: string; dueDate: string; nav: number; units: number }>;
  alreadyRecorded: Array<{ fund: string; dueDate: string }>;
  skipped: Array<{ fund: string; dueDate?: string; reason: string }>;
  error?: string;
}

type QueryClient = { from: (table: string) => any };

/** Official NAV on the due date, else the nearest published quote before it. */
async function officialNavOnOrBefore(
  admin: QueryClient,
  fundKey: string,
  dateStr: string
): Promise<{ date: string; nav: number } | null> {
  const { data } = await admin
    .from("nav_reference")
    .select("nav_date, nav_value")
    .eq("fund_key", fundKey)
    .lte("nav_date", dateStr)
    .order("nav_date", { ascending: false })
    .limit(1);
  const row = (data ?? [])[0];
  return row ? { date: row.nav_date, nav: Number(row.nav_value) } : null;
}

export async function syncTestUserInstallments(admin: QueryClient): Promise<SyncResult> {
  const result: SyncResult = {
    usersMatched: [],
    inserted: [],
    alreadyRecorded: [],
    skipped: [],
  };

  try {
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

    const today = nepalTodayAD();

    for (const user of users) {
      const { data: funds, error: fundsErr } = await admin
        .from("fund_config")
        .select("id, fund_name, monthly_sip, start_date, frequency, calendar_system, anchor_date, schedule_verified")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (fundsErr) {
        result.error = `fund lookup: ${fundsErr.message}`;
        continue;
      }

      for (const fund of funds ?? []) {
        const schedule = resolveSchedule(fund);
        if (schedule.source !== "registered") {
          result.skipped.push({
            fund: fund.fund_name,
            reason: "schedule not user-confirmed (verify it in settings to enable auto-recording)",
          });
          continue;
        }

        const amount = Number(fund.monthly_sip);
        if (!(amount > 0)) {
          result.skipped.push({ fund: fund.fund_name, reason: "monthly_sip not set" });
          continue;
        }

        const fundKey = normalizeFundName(fund.fund_name);

        // k = 0 is the anchor itself; walk forward until the due date
        // passes today. The anchor is typically recent, so this loop is short.
        for (let k = 0, guard = 0; guard < 500; k++, guard++) {
          const due = installmentDueDate(schedule.sip, k);
          if (due > today) break;

          const { data: existing } = await admin
            .from("entries")
            .select("id")
            .eq("user_id", user.id)
            .eq("fund_id", fund.id)
            .eq("purchase_date", due)
            .limit(1);
          if (existing && existing.length > 0) {
            result.alreadyRecorded.push({ fund: fund.fund_name, dueDate: due });
            continue;
          }

          const quote = await officialNavOnOrBefore(admin, fundKey, due);
          if (!quote) {
            result.skipped.push({
              fund: fund.fund_name,
              dueDate: due,
              reason: "no official NAV published on/before the due date",
            });
            continue;
          }

          const units = roundUnits((amount - DP_CHARGE) / quote.nav);
          const { error: insertErr } = await admin.from("entries").insert({
            user_id: user.id,
            fund_id: fund.id,
            purchase_date: due,
            amount,
            nav: quote.nav,
            units,
            notes: `Auto-recorded SIP installment (NAV of ${quote.date})`,
          });

          if (insertErr) {
            result.skipped.push({
              fund: fund.fund_name,
              dueDate: due,
              reason: `insert: ${insertErr.message}`,
            });
          } else {
            result.inserted.push({
              fund: fund.fund_name,
              dueDate: due,
              nav: quote.nav,
              units,
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
