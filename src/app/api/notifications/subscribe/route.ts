import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";

// Push endpoints must point at a real Web Push service — the stored
// URL is later used as the target of server-side POSTs (web-push
// sendNotification), so an arbitrary string would turn the cron into
// a request relay.
const PUSH_SERVICE_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
]);

function isValidPushEndpoint(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && PUSH_SERVICE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, p256dh, auth: clientAuth, userAgent } = body;

    if (!endpoint || !p256dh || !clientAuth) {
      return NextResponse.json({ error: "Missing required subscription keys" }, { status: 400 });
    }

    if (!isValidPushEndpoint(endpoint)) {
      return NextResponse.json(
        { error: "Unsupported push service endpoint" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Refuse to re-bind an endpoint that already belongs to another
    // user (the onConflict upsert would otherwise silently steal it).
    const { data: existingRows } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .eq("endpoint", endpoint)
      .limit(1);

    if (existingRows && existingRows.length > 0 && existingRows[0].user_id !== session.user.id) {
      return NextResponse.json(
        { error: "This subscription endpoint is already registered" },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: session.user.id,
          endpoint,
          p256dh,
          auth: clientAuth,
          user_agent: userAgent || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("[POST /api/notifications/subscribe] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/notifications/subscribe] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", session.user.id)
      .eq("endpoint", endpoint);

    if (error) {
      console.error("[DELETE /api/notifications/subscribe] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/notifications/subscribe] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
