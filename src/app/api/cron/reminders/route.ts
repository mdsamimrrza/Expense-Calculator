import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWebPush } from "@/lib/notifications/web-push";
import { sendInstallmentReminderEmail } from "@/lib/notifications/email-reminder";
import { nepalTodayAD, parseADString, scheduleAD } from "@/lib/calendar/bs";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export async function GET(req: Request) {
  return handleCronReminders(req);
}

export async function POST(req: Request) {
  return handleCronReminders(req);
}

async function handleCronReminders(req: Request) {
  try {
    // 1. Verify Cron Secret — fails closed when CRON_SECRET is unset
    if (!isAuthorizedCronRequest(req)) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const nextAuthSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "next_auth" } }
    );

    // 2. Fetch all active funds
    const { data: funds, error: fundsErr } = await supabase
      .from("fund_config")
      .select("id, user_id, fund_name, monthly_sip, start_date")
      .eq("is_active", true);

    if (fundsErr || !funds || funds.length === 0) {
      return NextResponse.json({ message: "No active funds found", processed: 0 });
    }

    // 3. Fetch all notification preferences and push subscriptions
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("user_id, push_enabled, email_enabled, notify_days_before");

    const prefMap = new Map<string, any>();
    if (preferences) {
      preferences.forEach((p) => prefMap.set(p.user_id, p));
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth");

    const subMap = new Map<string, any[]>();
    if (subscriptions) {
      subscriptions.forEach((s) => {
        const list = subMap.get(s.user_id) || [];
        list.push(s);
        subMap.set(s.user_id, list);
      });
    }

    // Fetch user emails from next_auth.users
    const userIds = Array.from(new Set(funds.map((f) => f.user_id)));
    const { data: users } = await nextAuthSupabase
      .from("users")
      .select("id, email, name")
      .in("id", userIds);

    const userMap = new Map<string, { email: string; name?: string }>();
    if (users) {
      users.forEach((u) => userMap.set(u.id, { email: u.email, name: u.name }));
    }

    // "Today" in Nepal time so the cron behaves identically on UTC servers.
    const todayStr = nepalTodayAD();

    // A payment cycle runs from one installment due date to the next, so the
    // previous due date is at most ~2 BS months before today. 70 days safely
    // covers that span for the "already deposited" lookup below.
    const { year: todayY, month: todayM, day: todayD } = parseADString(todayStr);
    const cutoff = new Date(Date.UTC(todayY, todayM, todayD) - 70 * 24 * 60 * 60 * 1000);
    const cutoffStr = `${cutoff.getUTCFullYear()}-${String(cutoff.getUTCMonth() + 1).padStart(2, "0")}-${String(cutoff.getUTCDate()).padStart(2, "0")}`;

    const { data: recentEntries } = await supabase
      .from("entries")
      .select("user_id, fund_id, purchase_date")
      .gt("purchase_date", cutoffStr);

    const entryDates = new Map<string, string[]>();
    if (recentEntries) {
      recentEntries.forEach((e) => {
        const key = `${e.user_id}_${e.fund_id}`;
        const list = entryDates.get(key) || [];
        list.push(e.purchase_date);
        entryDates.set(key, list);
      });
    }

    let pushSentCount = 0;
    let emailSentCount = 0;
    const expiredSubIds: string[] = [];

    // 4. Evaluate funds first (no side effects), collecting the funds
    //    that land inside their notify window today.
    interface DueFund {
      fund: (typeof funds)[number];
      nextDue: string;
      daysRemaining: number;
      pref: { push_enabled: boolean; email_enabled: boolean };
    }
    const dueFunds: DueFund[] = [];

    for (const fund of funds) {
      // Installment falls on (start day − 2) of every month: e.g. a fund
      // started on the 10th is due on the 8th of each following month.
      const dueDay = Math.max(1, parseADString(fund.start_date).day - 2);
      const { nextDue, prevDue, daysRemaining } = scheduleAD(dueDay, todayStr);

      // Skip if the current cycle is already paid (any entry recorded after the
      // previous due date; an entry ON the previous due date belongs to that
      // earlier cycle).
      const dates = entryDates.get(`${fund.user_id}_${fund.id}`) || [];
      if (dates.some((d) => d > prevDue)) {
        continue;
      }

      const pref = prefMap.get(fund.user_id) || {
        push_enabled: true,
        email_enabled: true,
        notify_days_before: 2,
      };

      const daysBefore = Number(pref.notify_days_before ?? 2);

      // Trigger if today matches the notify window (e.g. exactly daysBefore days left, or exactly due today)
      const shouldNotify = daysRemaining === daysBefore || daysRemaining === 0;

      if (!shouldNotify) {
        continue;
      }

      dueFunds.push({
        fund,
        nextDue,
        daysRemaining,
        pref: {
          push_enabled: Boolean(pref.push_enabled),
          email_enabled: Boolean(pref.email_enabled),
        },
      });
    }

    // 5. Dedup: skip funds already notified for this due date. The
    //    (user_id, fund_id, notify_date) unique index makes re-invoking
    //    the cron idempotent — no duplicate emails/pushes/log rows.
    let alreadyNotified = new Set<string>();
    let skippedAlreadyNotified = 0;
    if (dueFunds.length > 0) {
      const { data: existingLogs } = await supabase
        .from("notifications_log")
        .select("user_id, fund_id, notify_date")
        .in(
          "fund_id",
          dueFunds.map((d) => d.fund.id)
        )
        .not("notify_date", "is", null);

      alreadyNotified = new Set(
        (existingLogs ?? []).map(
          (l) => `${l.user_id}_${l.fund_id}_${l.notify_date}`
        )
      );
    }

    for (const due of dueFunds) {
      const { fund, nextDue, daysRemaining, pref } = due;
      const notifyKey = `${fund.user_id}_${fund.id}_${nextDue}`;
      if (alreadyNotified.has(notifyKey)) {
        skippedAlreadyNotified++;
        continue;
      }

      const user = userMap.get(fund.user_id);
      const formattedDueDate = new Date(`${nextDue}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Log notification to notifications_log table for in-app history
      const notifTitle =
        daysRemaining === 0
          ? `SIP Installment Due Today: ${fund.fund_name}`
          : `SIP Reminder: Due in ${daysRemaining} Days (${fund.fund_name})`;

      const notifBody =
        daysRemaining === 0
          ? `Your planned monthly deposit of NPR ${Number(fund.monthly_sip).toLocaleString()} is due today.`
          : `Your planned monthly installment of NPR ${Number(fund.monthly_sip).toLocaleString()} is due on ${formattedDueDate}.`;

      await supabase.from("notifications_log").insert({
        user_id: fund.user_id,
        fund_id: fund.id,
        notify_date: nextDue,
        title: notifTitle,
        body: notifBody,
        type: daysRemaining === 0 ? "due_today" : "installment_reminder",
        channel: pref.push_enabled && pref.email_enabled ? "all" : pref.push_enabled ? "push" : "email",
        url: "/history",
        is_read: false,
      });

      // Send Push Notifications
      if (pref.push_enabled) {
        const userSubs = subMap.get(fund.user_id) || [];
        for (const sub of userSubs) {
          const pushTitle =
            daysRemaining === 0
              ? `🔔 SIP Installment Due Today: ${fund.fund_name}`
              : `📅 SIP Reminder: Due in ${daysRemaining} Days (${fund.fund_name})`;

          const pushBody =
            daysRemaining === 0
              ? `Your planned monthly deposit of NPR ${Number(fund.monthly_sip).toLocaleString()} is due today. Tap to record your entry.`
              : `Your planned monthly installment for ${fund.fund_name} is due on ${formattedDueDate}.`;

          const pushRes = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            {
              title: pushTitle,
              body: pushBody,
              url: "/history",
            }
          );

          if (pushRes.success) {
            pushSentCount++;
          } else if (pushRes.shouldDelete) {
            expiredSubIds.push(sub.id);
          }
        }
      }

      // Send Email Notification
      if (pref.email_enabled && user?.email) {
        const emailRes = await sendInstallmentReminderEmail({
          to: user.email,
          userName: user.name,
          fundName: fund.fund_name,
          monthlySip: Number(fund.monthly_sip),
          dueDate: formattedDueDate,
          daysRemaining,
        });

        if (emailRes.success) {
          emailSentCount++;
        }
      }
    }

    // Cleanup expired push subscriptions
    if (expiredSubIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredSubIds);
    }

    return NextResponse.json({
      success: true,
      processedFunds: funds.length,
      dueFunds: dueFunds.length,
      skippedAlreadyNotified,
      pushSent: pushSentCount,
      emailsSent: emailSentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[CRON /api/cron/reminders] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
