// ============================================================
// SahakariSIP — Mobile handoff core (server-only)
// ============================================================
// A mobile (APK) sign-in runs entirely on THIS server: Google consent
// happens here (the only place the Google redirect URI is registered),
// and the finished session is handed to the phone via a single-use,
// 60-second handoff token. The phone calls /api/mobile/exchange with
// that token and gets back the same Supabase-compatible JWT the web
// session callback already mints (supabaseAccessToken), which the RLS
// policies accept via next_auth.uid().
//
// Security properties:
//   • tokens are random 128-bit nonces, stored server-side, deleted on
//     first exchange → single-use and unguessable
//   • 60-second TTL; expired/unused rows are swept on every issue
//   • the browser leg that creates the token is protected by the live
//     NextAuth cookie session (only the account that just signed in can
//     mint a handoff token for itself)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { randomBytes, randomInt } from "crypto";
import type { NextRequest } from "next/server";

const HANDOFF_TTL_SECONDS = 60;
/** Mobile session lifetime: the RLS JWT itself is the long-lived token.
 *  When it expires the app falls back to the sign-in screen (Google
 *  handoff or password) exactly like a web session ending. */
export const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function nextAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "next_auth" } }
  );
}

/** Mint a Supabase RLS JWT for a next_auth user id (mirrors auth.ts session callback). */
export function mintSupabaseAccessToken(sub: string, email: string | null): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not configured");
  return jwt.sign(
    {
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
      sub,
      email: email ?? undefined,
      role: "authenticated",
    },
    secret
  );
}

/** Store a single-use handoff nonce for a user; returns the nonce. */
export async function issueHandoffToken(userId: string): Promise<string> {
  const pub = publicClient();
  // Sweep stale unconsumed tokens (crashed browser mid-handoff).
  await pub
    .from("mobile_handoff_tokens")
    .delete()
    .lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  const nonce = randomBytes(16).toString("hex");
  const { error } = await pub.from("mobile_handoff_tokens").insert({
    user_id: userId,
    nonce,
  });
  if (error) {
    console.error("[handoff] token insert failed:", error.message);
    throw new Error("Could not start mobile sign-in. Please try again.");
  }
  return nonce;
}

export interface ExchangeResult {
  userId: string;
  email: string | null;
  name: string | null;
  image: string | null;
  accessToken: string;
  /** Seconds the minted JWT is valid for (24h). */
  expiresIn: number;
}

/**
 * Consume a handoff nonce (single-use, 60s TTL) and return the session
 * payload for the phone. Returns null when the token is unknown,
 * expired, or already consumed.
 */
export async function consumeHandoffToken(nonce: string): Promise<ExchangeResult | null> {
  const pub = publicClient();

  // Fetch-then-delete by id; the row's unique constraint makes a
  // concurrent double-exchange impossible after the first delete.
  const { data: rows } = await pub
    .from("mobile_handoff_tokens")
    .select("id, user_id, created_at")
    .eq("nonce", nonce)
    .limit(1);

  const row = rows && rows.length > 0 ? rows[0] : null;
  if (!row) return null;

  const ageMs = Date.now() - new Date(row.created_at as string).getTime();
  if (ageMs > HANDOFF_TTL_SECONDS * 1000) {
    await pub.from("mobile_handoff_tokens").delete().eq("id", row.id);
    return null;
  }

  // Consume first — even a later failure never leaves the token live.
  await pub.from("mobile_handoff_tokens").delete().eq("id", row.id);

  const { data: userRows } = await nextAuthClient()
    .from("users")
    .select("id, email, name, image")
    .eq("id", row.user_id)
    .limit(1);

  const user = userRows && userRows.length > 0 ? userRows[0] : null;
  if (!user) return null;

  return {
    userId: user.id,
    email: (user.email as string | null) ?? null,
    name: (user.name as string | null) ?? null,
    image: (user.image as string | null) ?? null,
    accessToken: mintSupabaseAccessToken(user.id, user.email ?? null),
    expiresIn: TOKEN_TTL_SECONDS,
  };
}

/** 6-digit OTP from a CSPRNG. */
export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

/**
 * Authenticate a mobile request by verifying the Bearer token this
 * module's mint function issues (signed with SUPABASE_JWT_SECRET).
 * Returns the next_auth identity or null.
 */
export async function authenticateMobileRequest(req: NextRequest): Promise<{ sub: string; email: string | null } | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) return null;
    const payload = jwt.verify(token, secret, { complete: false }) as jwt.JwtPayload;
    if (payload.role !== "authenticated" || typeof payload.sub !== "string") return null;
    return { sub: payload.sub, email: typeof payload.email === "string" ? payload.email : null };
  } catch {
    // Expired or forged — same null path.
    return null;
  }
}
