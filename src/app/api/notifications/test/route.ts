import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { sendWebPush } from "@/lib/notifications/web-push";
import { sendInstallmentReminderEmail } from "@/lib/notifications/email-reminder";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const type = body.type || "push"; // "push" or "email"

    const supabase = await createClient();

    // Fetch user's first active fund for realistic test data
    const { data: funds } = await supabase
      .from("fund_config")
      .select("fund_name, monthly_sip")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .limit(1);

    const activeFund = funds?.[0] || {
      fund_name: "NMB Saral Bachat Fund-E",
      monthly_sip: 5000,
    };

    if (type === "push") {
      // Fetch user's registered push subscriptions
      const { data: subs, error: subsErr } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", session.user.id);

      if (subsErr || !subs || subs.length === 0) {
        return NextResponse.json(
          {
            error: "No registered push devices found. Please enable push notifications on this device first.",
          },
          { status: 400 }
        );
      }

      let successCount = 0;
      const expiredSubIds: string[] = [];

      for (const sub of subs) {
        const result = await sendWebPush(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          {
            title: "🔔 SahakariSIP Test Alert",
            body: `Push notifications are active! Your upcoming monthly installment for ${activeFund.fund_name} is tracked.`,
            url: "/dashboard",
          }
        );

        if (result.success) {
          successCount++;
        } else if (result.shouldDelete) {
          expiredSubIds.push(sub.id);
        }
      }

      // Cleanup expired tokens
      if (expiredSubIds.length > 0) {
        await supabase.from("push_subscriptions").delete().in("id", expiredSubIds);
      }

      if (successCount === 0) {
        return NextResponse.json(
          { error: "Failed to deliver push notification to device." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Test push sent successfully to ${successCount} device(s).`,
      });
    }

    if (type === "email") {
      const email = session.user.email;
      if (!email) {
        return NextResponse.json({ error: "User email not found" }, { status: 400 });
      }

      const today = new Date();
      const dueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
      const formattedDueDate = dueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const emailResult = await sendInstallmentReminderEmail({
        to: email,
        userName: session.user.name || undefined,
        fundName: activeFund.fund_name,
        monthlySip: Number(activeFund.monthly_sip) || 5000,
        dueDate: formattedDueDate,
        daysRemaining: 2,
      });

      if (!emailResult.success) {
        return NextResponse.json(
          { error: emailResult.error || "Failed to send test email" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Test reminder email sent to ${email}.`,
      });
    }

    return NextResponse.json({ error: "Invalid test type" }, { status: 400 });
  } catch (err: any) {
    console.error("[POST /api/notifications/test] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
