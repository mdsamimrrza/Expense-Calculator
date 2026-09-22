"use server";

import { signOut as nextAuthSignOut } from "@/auth";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { createTransport } from "nodemailer";
import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";
import { checkEmailRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/types";

// ────────────────────────────────────────────────
// next_auth schema client (users, accounts tables)
// NOTE: next_auth schema must be in exposed schemas in Supabase API settings
// ────────────────────────────────────────────────
function getNextAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "next_auth" } }
  );
}

// Public schema client (otp_tokens + user_passwords live here)
// public schema is always exposed via PostgREST — no config needed
function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MAX_OTP_ATTEMPTS = 5;

// ────────────────────────────────────────────────
// OTP Email Sender
// ────────────────────────────────────────────────
async function sendOtpEmail(email: string, otp: string, purpose: "signup" | "password_reset") {
  const transport = createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT) || 587,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  const heading =
    purpose === "signup" ? "Confirm Your Email" : "Password Reset Code";
  const intro =
    purpose === "signup"
      ? "Use the code below to confirm your email address and activate your account. It expires in 10 minutes."
      : "Use the code below to reset your password. It expires in 10 minutes.";

  await transport.sendMail({
    to: email,
    from: process.env.EMAIL_FROM,
    subject: `🔐 Your SahakariSIP ${purpose === "signup" ? "Email Confirmation" : "Password Reset"} Code`,
    text: `Your OTP code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${heading}</title>
        </head>
        <body style="background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px; color: #f8fafc;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 10px 10px 25px -5px rgba(0, 0, 0, 0.5);">
            <tr>
              <td style="background-color: #0f172a; padding: 28px; text-align: center; border-bottom: 1px solid #334155;">
                <div style="font-size: 22px; font-weight: 900; color: #10b981; letter-spacing: -0.5px;">
                  📊 Sahakari<span style="color: #f59e0b;">SIP</span>
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; font-weight: 600; text-transform: uppercase;">
                  Mutual Fund Portfolio Ledger
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 36px 32px; text-align: center;">
                <h1 style="font-size: 18px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0;">${heading}</h1>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 28px 0;">
                  ${intro}
                </p>
                <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
                  <div style="font-size: 36px; font-weight: 900; color: #10b981; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                    ${otp}
                  </div>
                </div>
                <p style="font-size: 11px; color: #f59e0b; font-weight: 600; margin-top: 0; margin-bottom: 4px;">
                  ⏱️ This code is valid for 10 minutes only.
                </p>
                <p style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.5;">
                  If you didn't request this, you can safely ignore it.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #0f172a; padding: 18px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155;">
                SahakariSIP • Secure Investment Manager
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

// Generate a 6-digit OTP from a CSPRNG. Math.random() is not
// cryptographically secure and must never gate account recovery.
function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

// Create an OTP row (invalidates prior unused OTPs of the same
// purpose for the address) and email it.
async function issueOtp(
  email: string,
  purpose: "signup" | "password_reset"
): Promise<{ success: boolean; error?: string }> {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const publicClient = getPublicClient();

  // Invalidate any existing unused OTPs for this email + purpose
  await publicClient
    .from("otp_tokens")
    .update({ used: true })
    .eq("email", email)
    .eq("used", false)
    .eq("purpose", purpose);

  const { error: insertErr } = await publicClient.from("otp_tokens").insert({
    email,
    otp_hash: otpHash,
    expires_at: expiresAt.toISOString(),
    purpose,
  });

  if (insertErr) {
    return { success: false, error: "Failed to generate code. Please try again." };
  }

  try {
    await sendOtpEmail(email, otp, purpose);
  } catch {
    return { success: false, error: "Failed to send email. Please try again." };
  }

  return { success: true };
}

// ────────────────────────────────────────────────
// SIGN UP — Step 1: create unverified account + email OTP
// The account cannot sign in (credentials or Google claim) until
// the emailed code is confirmed via verifySignupOtp.
// ────────────────────────────────────────────────
export async function signUp(formData: FormData): Promise<ActionResult> {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !password || !confirmPassword) {
    return { success: false, error: "All fields are required." };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  const rateCheck = await checkEmailRateLimit(email);
  if (!rateCheck.success) {
    return { success: false, error: rateCheck.error };
  }

  const nextAuthClient = getNextAuthClient();
  const publicClient = getPublicClient();

  // Existing verified accounts are rejected; existing UNVERIFIED rows
  // (e.g. the email failed to arrive on a previous attempt) are treated
  // as a resend — refresh the password claim and issue a new code.
  const { data: existingRows } = await nextAuthClient
    .from("users")
    .select("id, emailVerified")
    .eq("email", email)
    .limit(1);

  const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

  if (existing && existing.emailVerified) {
    return { success: false, error: "An account with this email already exists. Please sign in." };
  }

  let userId: string;

  if (existing) {
    userId = existing.id as string;
    const passwordHash = await bcrypt.hash(password, 12);
    const { error: pwErr } = await publicClient
      .from("user_passwords")
      .upsert(
        { user_id: userId, password_hash: passwordHash, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (pwErr) {
      console.error("[signUp] password refresh error:", pwErr);
      return { success: false, error: "Failed to create account. Please try again." };
    }
  } else {
    // Create user in next_auth.users — UNVERIFIED until the emailed
    // code is confirmed. emailVerified gates both credentials login
    // (authorize) and Google account linking (signIn callback).
    const { data: newUser, error: createErr } = await nextAuthClient
      .from("users")
      .insert({ email, emailVerified: null })
      .select("id")
      .single();

    if (createErr || !newUser) {
      console.error("[signUp] user creation error:", createErr);
      return { success: false, error: "Failed to create account. Please try again." };
    }
    userId = newUser.id;

    // Hash password and store in public.user_passwords
    const passwordHash = await bcrypt.hash(password, 12);
    const { error: pwErr } = await publicClient
      .from("user_passwords")
      .insert({ user_id: userId, password_hash: passwordHash });

    if (pwErr) {
      console.error("[signUp] password insert error:", pwErr);
      // Rollback user creation
      await nextAuthClient.from("users").delete().eq("id", userId);
      return { success: false, error: "Failed to create account. Please try again." };
    }
  }

  const otpResult = await issueOtp(email, "signup");
  if (!otpResult.success) {
    return { success: false, error: otpResult.error };
  }

  return { success: true };
}

// ────────────────────────────────────────────────
// SIGN UP — Step 2: confirm the emailed code
// Marks the account verified; credentials login and Google
// linking only work from this point on.
// ────────────────────────────────────────────────
export async function verifySignupOtp(
  email: string,
  otpCode: string
): Promise<ActionResult> {
  if (!email || !otpCode || otpCode.length !== 6) {
    return { success: false, error: "Invalid OTP code." };
  }

  const publicClient = getPublicClient();
  const normalizedEmail = email.toLowerCase().trim();

  const result = await consumeOtp(normalizedEmail, otpCode, "signup");
  if (!result.success) {
    return result;
  }

  const nextAuthClient = getNextAuthClient();
  const { error: verifyErr } = await nextAuthClient
    .from("users")
    .update({ emailVerified: new Date().toISOString() })
    .eq("email", normalizedEmail)
    .eq("emailVerified", null);

  if (verifyErr) {
    console.error("[verifySignupOtp] verification error:", verifyErr);
    return { success: false, error: "Failed to confirm your email. Please try again." };
  }

  return { success: true };
}

// ────────────────────────────────────────────────
// Shared OTP consumption: attempt-limited verification.
// Each wrong code increments the row's attempt counter; after
// MAX_OTP_ATTEMPTS failures the OTP is burned and a new one
// must be requested.
// ────────────────────────────────────────────────
async function consumeOtp(
  normalizedEmail: string,
  otpCode: string,
  purpose: "signup" | "password_reset"
): Promise<ActionResult & { resetToken?: string; email?: string }> {
  const publicClient = getPublicClient();

  // Latest unused, non-expired OTP of this purpose for this email
  const { data: tokenRows, error } = await publicClient
    .from("otp_tokens")
    .select("id, otp_hash, expires_at, attempts")
    .eq("email", normalizedEmail)
    .eq("used", false)
    .eq("purpose", purpose)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !tokenRows || tokenRows.length === 0) {
    return { success: false, error: "OTP code expired or invalid. Please request a new one." };
  }

  const token = tokenRows[0];
  const attemptsUsed = Number(token.attempts ?? 0);

  if (attemptsUsed >= MAX_OTP_ATTEMPTS) {
    // Burn the OTP so the counter can never be reset by replay.
    await publicClient.from("otp_tokens").update({ used: true }).eq("id", token.id);
    return {
      success: false,
      error: "Too many incorrect attempts. Please request a new code.",
    };
  }

  const isValid = await bcrypt.compare(otpCode, token.otp_hash);

  if (!isValid) {
    const newAttempts = attemptsUsed + 1;
    const burned = newAttempts >= MAX_OTP_ATTEMPTS;
    await publicClient
      .from("otp_tokens")
      .update({ attempts: newAttempts, used: burned })
      .eq("id", token.id);

    return {
      success: false,
      error: burned
        ? "Too many incorrect attempts. Please request a new code."
        : `Incorrect OTP code. ${MAX_OTP_ATTEMPTS - newAttempts} attempt(s) remaining.`,
    };
  }

  // Generate a short-lived reset token (password-reset flow only)
  const resetToken = purpose === "password_reset" ? randomBytes(32).toString("hex") : null;

  // Mark OTP as used and store reset token
  await publicClient
    .from("otp_tokens")
    .update({ used: true, reset_token: resetToken })
    .eq("id", token.id);

  return { success: true, resetToken: resetToken ?? undefined, email: normalizedEmail };
}

// ────────────────────────────────────────────────
// SIGN OUT
// ────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await nextAuthSignOut({ redirectTo: "/" });
}

// ────────────────────────────────────────────────
// FORGOT PASSWORD — Step 1: Send OTP
// ────────────────────────────────────────────────
export async function forgotPassword(formData: FormData): Promise<ActionResult> {
  const email = (formData.get("email") as string)?.toLowerCase().trim();

  if (!email) {
    return { success: false, error: "Email address is required." };
  }

  // Rate Limiting: Max 5 OTP requests per hour (shared across instances)
  const rateCheck = await checkEmailRateLimit(email);
  if (!rateCheck.success) {
    return { success: false, error: rateCheck.error };
  }

  const nextAuthClient = getNextAuthClient();

  // Check if user exists (don't reveal if they don't — security best practice)
  const { data: userRows } = await nextAuthClient
    .from("users")
    .select("id")
    .eq("email", email)
    .limit(1);

  // Always return success to prevent email enumeration
  if (!userRows || userRows.length === 0) {
    return { success: true };
  }

  const otpResult = await issueOtp(email, "password_reset");
  if (!otpResult.success) {
    // Keep the enumeration-safe uniform response: report a generic
    // failure without revealing whether the account exists.
    return { success: false, error: otpResult.error };
  }

  return { success: true };
}

// ────────────────────────────────────────────────
// VERIFY OTP — Step 2: Validate OTP code
// ────────────────────────────────────────────────
export async function verifyOtp(
  email: string,
  otpCode: string
): Promise<ActionResult & { resetToken?: string; email?: string }> {
  if (!email || !otpCode || otpCode.length !== 6) {
    return { success: false, error: "Invalid OTP code." };
  }

  return consumeOtp(email.toLowerCase().trim(), otpCode, "password_reset");
}

// ────────────────────────────────────────────────
// RESET PASSWORD — Step 3: Set new password
// ────────────────────────────────────────────────
export async function resetPassword(
  email: string,
  resetToken: string,
  newPassword: string,
  confirmPassword: string
): Promise<ActionResult> {
  if (!email || !resetToken || !newPassword || !confirmPassword) {
    return { success: false, error: "All fields are required." };
  }

  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  const publicClient = getPublicClient();

  // Validate reset token
  const { data: tokenRows } = await publicClient
    .from("otp_tokens")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .eq("reset_token", resetToken)
    .eq("used", true)
    .gt("expires_at", new Date().toISOString())
    .limit(1);

  if (!tokenRows || tokenRows.length === 0) {
    return { success: false, error: "Invalid or expired reset session. Please start over." };
  }

  const nextAuthClient = getNextAuthClient();

  // Get user id + current credential epoch from next_auth.users
  const { data: userRows, error: userErr } = await nextAuthClient
    .from("users")
    .select("id, credential_epoch")
    .eq("email", email.toLowerCase().trim())
    .limit(1);

  if (userErr || !userRows || userRows.length === 0) {
    console.error("[resetPassword] user lookup error:", userErr);
    return { success: false, error: "User not found." };
  }

  const user = userRows[0];
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Upsert into public.user_passwords
  // (public schema is always accessible via PostgREST service role)
  const { error: upsertErr } = await publicClient
    .from("user_passwords")
    .upsert(
      { user_id: user.id, password_hash: passwordHash, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (upsertErr) {
    console.error("[resetPassword] upsert error:", upsertErr);
    return { success: false, error: "Failed to update password. Please try again." };
  }

  // Bump the credential epoch so every previously issued JWT session
  // for this account becomes stale (jwt callback rejects old epochs).
  const { error: epochErr } = await nextAuthClient
    .from("users")
    .update({ credential_epoch: Number(user.credential_epoch ?? 0) + 1 })
    .eq("id", user.id);

  if (epochErr) {
    console.error("[resetPassword] epoch bump error:", epochErr);
  }

  // Clean up OTP token
  await publicClient.from("otp_tokens").delete().eq("id", tokenRows[0].id);

  return { success: true };
}

// ────────────────────────────────────────────────
// DELETE ACCOUNT
// ────────────────────────────────────────────────
export async function deleteAccount(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const nextAuthClient = getNextAuthClient();
  const publicClient = getPublicClient();

  // Fetch the email first so orphan-prone rows keyed by email
  // (otp_tokens) can be cleaned explicitly — they have no FK cascade.
  const { data: userRows } = await nextAuthClient
    .from("users")
    .select("email")
    .eq("id", session.user.id)
    .limit(1);
  const email = userRows && userRows.length > 0 ? userRows[0].email : null;

  // Explicit cleanup for tables without FK cascades to next_auth.users
  await publicClient.from("user_passwords").delete().eq("user_id", session.user.id);
  if (email) {
    await publicClient.from("otp_tokens").delete().eq("email", email);
  }

  const { error } = await nextAuthClient
    .from("users")
    .delete()
    .eq("id", session.user.id);

  if (error) {
    // Generic message: raw Supabase errors can leak schema internals.
    console.error("[deleteAccount] delete error:", error);
    return { success: false, error: "Failed to delete account. Please try again later." };
  }

  return { success: true };
}
