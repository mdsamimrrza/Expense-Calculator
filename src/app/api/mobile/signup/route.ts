// ============================================================
// POST /api/mobile/signup { email, password, confirmPassword }
// PUT  /api/mobile/signup { email, code }
// ============================================================
// Wraps the web's existing OTP signup server actions for the APK.
// Step 1 creates the unverified account + emails a 6-digit code;
// step 2 (PUT) confirms it. Mailbox control is proven by the OTP, so
// verify also mints the mobile session and the phone is signed in the
// moment the code lands.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { signUp, verifySignupOtp } from "@/lib/actions/auth";
import { mintSupabaseAccessToken, TOKEN_TTL_SECONDS } from "../handoff-core";

function nextAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "next_auth" } }
  );
}

export async function POST(req: NextRequest) {
  let body: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const formData = new FormData();
  formData.set("email", String(body?.email ?? ""));
  formData.set("password", String(body?.password ?? ""));
  formData.set("confirmPassword", String(body?.confirmPassword ?? ""));

  const result = await signUp(formData);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, needsEmailConfirmation: true });
}

/** Step 2: confirm the emailed code, then mint the session. */
export async function PUT(req: NextRequest) {
  let body: { email?: string; code?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const email = typeof body?.email === "string" ? body.email : "";
  const code = typeof body?.code === "string" ? body.code : "";

  const result = await verifySignupOtp(email, code);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();
  const { data: rows } = await nextAuthClient()
    .from("users")
    .select("id, email, name, image, credential_epoch")
    .eq("email", normalized)
    .limit(1);
  const row = rows?.[0];
  if (!row) {
    // Verification succeeded but the row vanished — the user can sign
    // in normally now, so report success without a session.
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: row.id,
      email: (row.email as string | null) ?? null,
      name: (row.name as string | null) ?? null,
      image: (row.image as string | null) ?? null,
    },
    access_token: mintSupabaseAccessToken(row.id as string, (row.email as string | null) ?? null, Number(row.credential_epoch ?? 0)),
    expires_in: TOKEN_TTL_SECONDS,
  });
}
