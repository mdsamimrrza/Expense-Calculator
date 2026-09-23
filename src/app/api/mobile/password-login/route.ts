// ============================================================
// POST /api/mobile/password-login { email, password }
// ============================================================
// Credentials sign-in for the APK against the web's own bcrypt/OTP
// store (shared verifyCredentials core). Successful → mint the mobile
// session token directly (no browser handoff needed).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/credentials-core";
import { mintSupabaseAccessToken, TOKEN_TTL_SECONDS } from "../handoff-core";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const result = await verifyCredentials(email, password);

  if (!result.ok) {
    const message =
      result.reason === "locked"
        ? "Too many failed attempts. Please wait an hour and try again."
        : result.reason === "unverified"
          ? "Please confirm your email address first (check your inbox)."
          : "Invalid email or password.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  return NextResponse.json({
    user: result.user,
    access_token: mintSupabaseAccessToken(result.user.id, result.user.email, result.credentialEpoch),
    expires_in: TOKEN_TTL_SECONDS,
  });
}
