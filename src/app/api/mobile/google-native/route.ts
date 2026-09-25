// ============================================================
// SahakariSIP - Native Google Sign-In endpoint
// ============================================================
// Called by the Android APK after the user picks their Google account
// via @react-native-google-signin/google-signin. The APK sends the
// Google ID token; we verify it with Google, find or create the
// next_auth user, and return the same Supabase RLS JWT that the
// web session callback mints.
//
// POST /api/mobile/google-native
//   Body: { idToken: string }
//   Returns: { user, access_token, expires_in }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mintSupabaseAccessToken, TOKEN_TTL_SECONDS } from "../handoff-core";

const GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function getServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function nextAuthClient() {
  return createClient(getSupabaseUrl(), getServiceKey(), {
    db: { schema: "next_auth" },
  });
}

interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: string;
  name?: string;
  picture?: string;
  aud: string;
  exp: string;
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload | null> {
  try {
    const res = await fetch(`${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return null;
    const payload = (await res.json()) as GoogleTokenPayload;

    // Verify the token is not expired
    if (Date.now() / 1000 > Number(payload.exp)) return null;

    // Verify the audience matches our Android client ID or web client ID
    const androidClientId = process.env.GOOGLE_ANDROID_CLIENT_ID;
    const webClientId = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "416335590615-7qmsb34qr1aegnng0rfsib9lca10ke3m.apps.googleusercontent.com";
    const validAudiences = [androidClientId, webClientId, "416335590615-7qmsb34qr1aegnng0rfsib9lca10ke3m.apps.googleusercontent.com"].filter(Boolean);
    if (validAudiences.length > 0 && !validAudiences.includes(payload.aud)) {
      console.error("[google-native] Token audience mismatch:", payload.aud);
      return null;
    }

    return payload;
  } catch (err) {
    console.error("[google-native] Token verification error:", err);
    return null;
  }
}

/** Find or create a next_auth user for the given Google account. */
async function findOrCreateUser(googlePayload: GoogleTokenPayload): Promise<{
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  credential_epoch: number;
} | null> {
  const db = nextAuthClient();

  // Check if an account already exists for this Google sub
  const { data: accounts } = await db
    .from("accounts")
    .select("user_id")
    .eq("provider", "google")
    .eq("provider_account_id", googlePayload.sub)
    .limit(1);

  if (accounts && accounts.length > 0) {
    // Account exists - fetch the user
    const { data: users } = await db
      .from("users")
      .select("id, email, name, image, credential_epoch")
      .eq("id", accounts[0].user_id)
      .limit(1);
    if (users && users.length > 0) {
      return {
        id: users[0].id as string,
        email: users[0].email as string,
        name: (users[0].name as string | null) ?? null,
        image: (users[0].image as string | null) ?? null,
        credential_epoch: Number(users[0].credential_epoch ?? 0),
      };
    }
  }

  // Check if user exists by email (may have a password account)
  const { data: usersByEmail } = await db
    .from("users")
    .select("id, email, name, image, credential_epoch")
    .eq("email", googlePayload.email.toLowerCase())
    .limit(1);

  let userId: string;
  let credentialEpoch = 0;

  if (usersByEmail && usersByEmail.length > 0) {
    // User exists but no Google account - link them
    userId = usersByEmail[0].id as string;
    credentialEpoch = Number(usersByEmail[0].credential_epoch ?? 0);
  } else {
    // Create new user
    const newId = crypto.randomUUID();
    const { error: userErr } = await db.from("users").insert({
      id: newId,
      email: googlePayload.email.toLowerCase(),
      name: googlePayload.name ?? null,
      image: googlePayload.picture ?? null,
      email_verified: new Date().toISOString(),
      credential_epoch: 0,
    });
    if (userErr) {
      console.error("[google-native] user insert failed:", userErr.message);
      return null;
    }
    userId = newId;
  }

  // Link Google account
  await db.from("accounts").upsert(
    {
      user_id: userId,
      type: "oauth",
      provider: "google",
      provider_account_id: googlePayload.sub,
    },
    { onConflict: "provider,provider_account_id" }
  );

  const { data: finalUser } = await db
    .from("users")
    .select("id, email, name, image, credential_epoch")
    .eq("id", userId)
    .limit(1);

  if (!finalUser || finalUser.length === 0) return null;

  return {
    id: finalUser[0].id as string,
    email: finalUser[0].email as string,
    name: (finalUser[0].name as string | null) ?? null,
    image: (finalUser[0].image as string | null) ?? null,
    credential_epoch: Number(finalUser[0].credential_epoch ?? 0),
  };
}

export async function POST(req: NextRequest) {
  let body: { idToken?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const idToken = typeof body?.idToken === "string" ? body.idToken.trim() : "";
  if (!idToken) {
    return NextResponse.json({ error: "idToken is required." }, { status: 400 });
  }

  const googlePayload = await verifyGoogleIdToken(idToken);
  if (!googlePayload) {
    return NextResponse.json({ error: "Google ID token is invalid or expired." }, { status: 401 });
  }

  if (!getSupabaseUrl() || !getServiceKey()) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 503 });
  }

  const user = await findOrCreateUser(googlePayload);
  if (!user) {
    return NextResponse.json({ error: "Could not create or find your account. Please try again." }, { status: 500 });
  }

  let accessToken: string;
  try {
    accessToken = mintSupabaseAccessToken(user.id, user.email, user.credential_epoch);
  } catch (err) {
    console.error("[google-native] JWT mint failed:", err);
    return NextResponse.json({ error: "Server authentication configuration error." }, { status: 500 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
    access_token: accessToken,
    expires_in: TOKEN_TTL_SECONDS,
  });
}
