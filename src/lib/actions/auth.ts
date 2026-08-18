"use server";

import { signOut as nextAuthSignOut } from "@/auth";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { createTransport } from "nodemailer";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
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

// ────────────────────────────────────────────────
// OTP Email Sender
// ────────────────────────────────────────────────
async function sendOtpEmail(email: string, otp: string) {
  const transport = createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT) || 587,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  await transport.sendMail({
    to: email,
    from: process.env.EMAIL_FROM,
    subject: `🔐 Your SahakariSIP Password Reset Code`,
    text: `Your OTP code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP</title>
        </head>
        <body style="background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px; color: #f8fafc;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
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
                <h1 style="font-size: 18px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0;">Password Reset Code</h1>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 28px 0;">
                  Use the code below to reset your password. It expires in 10 minutes.
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

// ────────────────────────────────────────────────
// SIGN UP
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

  const nextAuthClient = getNextAuthClient();
  const publicClient = getPublicClient();

  // Check if email already exists in next_auth.users
  const { data: existing } = await nextAuthClient
    .from("users")
    .select("id")
    .eq("email", email)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "An account with this email already exists. Please sign in." };
  }

  // Create user in next_auth.users
  const { data: newUser, error: createErr } = await nextAuthClient
    .from("users")
    .insert({ email, emailVerified: new Date().toISOString() })
    .select("id")
    .single();

  if (createErr || !newUser) {
    console.error("[signUp] user creation error:", createErr);
    return { success: false, error: "Failed to create account. Please try again." };
  }

  // Hash password and store in public.user_passwords
  const passwordHash = await bcrypt.hash(password, 12);
  const { error: pwErr } = await publicClient
    .from("user_passwords")
    .insert({ user_id: newUser.id, password_hash: passwordHash });

  if (pwErr) {
    console.error("[signUp] password insert error:", pwErr);
    // Rollback user creation
    await nextAuthClient.from("users").delete().eq("id", newUser.id);
    return { success: false, error: "Failed to create account. Please try again." };
  }

  return { success: true };
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

  // Rate Limiting: Max 5 OTP requests per hour
  const rateCheck = checkEmailRateLimit(email);
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

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const publicClient = getPublicClient();

  // Invalidate any existing unused OTPs for this email
  await publicClient
    .from("otp_tokens")
    .update({ used: true })
    .eq("email", email)
    .eq("used", false);

  // Insert new OTP
  const { error: insertErr } = await publicClient
    .from("otp_tokens")
    .insert({ email, otp_hash: otpHash, expires_at: expiresAt.toISOString() });

  if (insertErr) {
    return { success: false, error: "Failed to generate reset code. Please try again." };
  }

  // Send OTP email
  try {
    await sendOtpEmail(email, otp);
  } catch {
    return { success: false, error: "Failed to send email. Please try again." };
  }

  return { success: true };
}

// ────────────────────────────────────────────────
// VERIFY OTP — Step 2: Validate OTP code
// ────────────────────────────────────────────────
export async function verifyOtp(
  email: string,
  otpCode: string
): Promise<ActionResult & { resetToken?: string }> {
  if (!email || !otpCode || otpCode.length !== 6) {
    return { success: false, error: "Invalid OTP code." };
  }

  const publicClient = getPublicClient();

  // Get latest unused, non-expired OTP for this email
  const { data: tokenRows, error } = await publicClient
    .from("otp_tokens")
    .select("id, otp_hash, expires_at")
    .eq("email", email.toLowerCase().trim())
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !tokenRows || tokenRows.length === 0) {
    return { success: false, error: "OTP code expired or invalid. Please request a new one." };
  }

  const token = tokenRows[0];
  const isValid = await bcrypt.compare(otpCode, token.otp_hash);

  if (!isValid) {
    return { success: false, error: "Incorrect OTP code. Please try again." };
  }

  // Generate a short-lived reset token
  const resetToken = randomBytes(32).toString("hex");

  // Mark OTP as used and store reset token
  await publicClient
    .from("otp_tokens")
    .update({ used: true, reset_token: resetToken })
    .eq("id", token.id);

  return { success: true, resetToken };
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

  // Get user id from next_auth.users
  const { data: userRows, error: userErr } = await nextAuthClient
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .limit(1);

  if (userErr || !userRows || userRows.length === 0) {
    console.error("[resetPassword] user lookup error:", userErr);
    return { success: false, error: "User not found." };
  }

  const userId = userRows[0].id;
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Upsert into public.user_passwords
  // (public schema is always accessible via PostgREST service role)
  const { error: upsertErr } = await publicClient
    .from("user_passwords")
    .upsert(
      { user_id: userId, password_hash: passwordHash, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (upsertErr) {
    console.error("[resetPassword] upsert error:", upsertErr);
    return { success: false, error: "Failed to update password. Please try again." };
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

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", session.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
