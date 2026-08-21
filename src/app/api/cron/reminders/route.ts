import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWebPush } from "@/lib/notifications/web-push";
import { sendInstallmentReminderEmail } from "@/lib/notifications/email-reminder";

export async function GET(req: Request) {
  return handleCronReminders(req);
}

export async function POST(req: Request) {
  return handleCronReminders(req);
}

async function handleCronReminders(req: Request) {
  try {
    // 1. Verify Cron Secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
      .select("user_id, push_enabled, email_enabled, reminder_day, notify_days_before");

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

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentDay = today.getDate();

    // First day of current month in YYYY-MM-DD
    const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const nextMonthStartStr =
      currentMonth === 11
        ? `${currentYear + 1}-01-01`
        : `${currentYear}-${String(currentMonth + 2).padStart(2, "0")}-01`;

    // Fetch current month's entries to check if already deposited
    const { data: monthlyEntries } = await supabase
      .from("entries")
      .select("user_id, fund_id, purchase_date")
      .gte("purchase_date", monthStartStr)
      .lt("purchase_date", nextMonthStartStr);

    const depositedFunds = new Set<string>();
    if (monthlyEntries) {
      monthlyEntries.forEach((e) => depositedFunds.add(`${e.user_id}_${e.fund_id}`));
    }

    let pushSentCount = 0;
    let emailSentCount = 0;
    const expiredSubIds: string[] = [];

    // 4. Iterate over funds and evaluate reminders
    for (const fund of funds) {
      // If user has already deposited this month for this fund, skip reminder
      if (depositedFunds.has(`${fund.user_id}_${fund.id}`)) {
        continue;
      }

      const pref = prefMap.get(fund.user_id) || {
        push_enabled: true,
        email_enabled: true,
        reminder_day: 1,
        notify_days_before: 2,
      };

      // Determine installment target day (1-28)
      const targetDay = pref.reminder_day || 1;
      const daysBefore = pref.notify_days_before ?? 2;

      // Due date object for current month
      const dueDate = new Date(currentYear, currentMonth, targetDay);
      const diffTime = dueDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Trigger if today matches the notify window (e.g. exactly daysBefore days left, or exactly due today)
      const shouldNotify = daysRemaining === daysBefore || daysRemaining === 0;

      if (!shouldNotify) {
        continue;
      }

      const user = userMap.get(fund.user_id);
      const formattedDueDate = dueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
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
      pushSent: pushSentCount,
      emailsSent: emailSentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[CRON /api/cron/reminders] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
