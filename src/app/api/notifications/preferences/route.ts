import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("push_enabled, email_enabled, reminder_day, notify_days_before")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/notifications/preferences] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Default preferences if none saved yet
    const preferences = data || {
      push_enabled: true,
      email_enabled: true,
      reminder_day: 1,
      notify_days_before: 2,
    };

    return NextResponse.json({ success: true, data: preferences });
  } catch (err: any) {
    console.error("[GET /api/notifications/preferences] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { push_enabled, email_enabled, reminder_day, notify_days_before } = body;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: session.user.id,
          push_enabled: push_enabled ?? true,
          email_enabled: email_enabled ?? true,
          reminder_day: Math.max(1, Math.min(28, Number(reminder_day) || 1)),
          notify_days_before: Math.max(0, Math.min(7, Number(notify_days_before) || 2)),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("[POST /api/notifications/preferences] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[POST /api/notifications/preferences] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
