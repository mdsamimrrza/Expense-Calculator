// ============================================================
// SahakariSIP - Shared credential verification core
// ============================================================
// One implementation of the email+password check (brute-force limiter,
// emailVerified gate, bcrypt compare) used by BOTH:
//   • the NextAuth Credentials provider (src/auth.ts authorize)
//   • the mobile (APK) handoff API (src/app/api/mobile/*)
// so a phone and a browser can never disagree on whether a login is
// valid. Server-side only - uses the service-role client.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

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

export const MAX_LOGIN_ATTEMPTS_PER_HOUR = 10;

export type CredentialCheck =
  | {
      ok: true;
      user: { id: string; email: string; name: string | null; image: string | null };
      credentialEpoch: number;
    }
  | { ok: false; reason: "invalid" | "unverified" | "locked" };

/**
 * Validate email+password against next_auth.users + public.user_passwords.
 * Records failed attempts into the shared rate_limit_events limiter so
 * web and mobile share one lockout budget per address.
 */
export async function verifyCredentials(
  rawEmail: string,
  password: string
): Promise<CredentialCheck> {
  const email = rawEmail.toLowerCase().trim();
  if (!email || !password) return { ok: false, reason: "invalid" };

  const pub = publicClient();

  const { count: recentFailures, error: attemptErr } = await pub
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("key", `login:${email}`)
    .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if (!attemptErr && (recentFailures ?? 0) >= MAX_LOGIN_ATTEMPTS_PER_HOUR) {
    return { ok: false, reason: "locked" };
  }

  const { data: userRows } = await nextAuthClient()
    .from("users")
    .select("id, email, name, image, emailVerified, credential_epoch")
    .eq("email", email)
    .limit(1);

  const user = userRows && userRows.length > 0 ? userRows[0] : null;
  if (!user) return { ok: false, reason: "invalid" };

  // Accounts created via signup are unusable until the emailed code
  // proves mailbox ownership (mirrors auth.ts authorize).
  if (!user.emailVerified) return { ok: false, reason: "unverified" };

  const { data: pwRows } = await pub
    .from("user_passwords")
    .select("password_hash")
    .eq("user_id", user.id)
    .limit(1);

  if (!pwRows || pwRows.length === 0) {
    // Google-only account - no password exists.
    return { ok: false, reason: "invalid" };
  }

  const isValid = await bcrypt.compare(password, pwRows[0].password_hash);
  if (!isValid) {
    await pub.from("rate_limit_events").insert({ key: `login:${email}` });
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    user: {
      id: user.id as string,
      email: user.email as string,
      name: (user.name as string | null) ?? null,
      image: (user.image as string | null) ?? null,
    },
    credentialEpoch: Number(user.credential_epoch ?? 0),
  };
}
