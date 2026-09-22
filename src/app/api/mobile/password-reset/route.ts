// ============================================================
// POST /api/mobile/password-reset { email }            → send OTP
// PUT  /api/mobile/password-reset { email, code }      → verify OTP
// PATCH /api/mobile/password-reset { email, resetToken,
//        newPassword, confirmPassword }                → set password
// ============================================================
// The web's 3-step OTP reset flow (src/lib/actions/auth.ts), exposed
// to the APK. resetToken chains step 2 → step 3 the same way the web
// UI does; the APK keeps it in memory only.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { forgotPassword, verifyOtp, resetPassword } from "@/lib/actions/auth";

export async function POST(req: NextRequest) {
  let body: { email?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const formData = new FormData();
  formData.set("email", String(body?.email ?? ""));

  const result = await forgotPassword(formData);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
  let body: { email?: string; code?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const email = typeof body?.email === "string" ? body.email : "";
  const code = typeof body?.code === "string" ? body.code : "";

  const result = await verifyOtp(email, code);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, resetToken: result.resetToken });
}

export async function PATCH(req: NextRequest) {
  let body: {
    email?: string;
    resetToken?: string;
    newPassword?: string;
    confirmPassword?: string;
  } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const result = await resetPassword(
    String(body?.email ?? ""),
    String(body?.resetToken ?? ""),
    String(body?.newPassword ?? ""),
    String(body?.confirmPassword ?? "")
  );
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
