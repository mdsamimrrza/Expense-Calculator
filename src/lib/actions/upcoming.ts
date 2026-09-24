"use server";

import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { computeSchedule, nepalTodayAD, formatBSDate } from "@/lib/calendar/bs";
import { resolveSchedule } from "@/lib/sip-schedule";
import type { FundConfig, UpcomingInstallment } from "@/lib/types";

/**
 * Upcoming installments for the popup card - derived through the same
 * central engine + resolver as the cards and the reminder cron.
 */
export async function getUpcomingInstallments(): Promise<UpcomingInstallment[]> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("fund_config")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const todayStr = nepalTodayAD();
  const upcoming: UpcomingInstallment[] = [];
  for (const f of (data ?? []) as FundConfig[]) {
    const { sip } = resolveSchedule(f);
    const { nextDue, daysRemaining } = computeSchedule(sip, todayStr);
    upcoming.push({
      fundId: f.id,
      fundName: f.fund_name,
      nextDue,
      nextDueBS: sip.calendarSystem === "BS" ? formatBSDate(nextDue) : null,
      daysRemaining,
      amount: Number(f.monthly_sip),
    });
  }
  upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return upcoming;
}
