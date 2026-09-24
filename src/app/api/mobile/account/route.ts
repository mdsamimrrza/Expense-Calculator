// ============================================================
// DELETE /api/mobile/account - delete the signed-in account
// ============================================================
// Bearer-authenticated with the mobile RLS JWT (this module's own
// mint). Mirrors the web deleteAccount action: app data rows are gone
// before this is called (the APK deletes them through RLS), so only
// the identity rows remain: user_passwords, otp_tokens, next_auth.users.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateMobileRequest } from "../handoff-core";

function nextAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "next_auth" } }
  );
}

function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const caller = await authenticateMobileRequest(req);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows } = await nextAuthClient()
    .from("users")
    .select("id, email, name, image")
    .eq("id", caller.sub)
    .limit(1);
  const row = rows?.[0];
  if (!row) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: row.id,
      email: (row.email as string | null) ?? null,
      name: (row.name as string | null) ?? null,
      image: (row.image as string | null) ?? null,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const caller = await authenticateMobileRequest(req);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pub = publicClient();

  // otp_tokens are keyed by email and have no FK cascade.
  const { data: userRows } = await nextAuthClient()
    .from("users")
    .select("email")
    .eq("id", caller.sub)
    .limit(1);
  const email = userRows && userRows.length > 0 ? (userRows[0].email as string) : null;

  await pub.from("user_passwords").delete().eq("user_id", caller.sub);
  if (email) {
    await pub.from("otp_tokens").delete().eq("email", email);
  }

  const { error } = await nextAuthClient().from("users").delete().eq("id", caller.sub);
  if (error) {
    console.error("[mobile account delete]", error.message);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again later." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
