import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import jwt from "jsonwebtoken";
import type { Provider } from "next-auth/providers";
import { authConfig } from "./auth.config";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    supabaseAccessToken?: string;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

// Client for next_auth schema (users, accounts)
function getNextAuthClient() {
  return createClient(supabaseUrl, supabaseSecret, {
    db: { schema: "next_auth" },
  });
}

// Client for public schema (user_passwords, otp_tokens, rate_limit_events)
function getPublicClient() {
  return createClient(supabaseUrl, supabaseSecret);
}

const MAX_LOGIN_ATTEMPTS_PER_HOUR = 10;

const providers: Provider[] = [
  // Google verifies mailbox ownership, so linking an OAuth sign-in to an
  // existing row for the same email is safe. The signIn callback below
  // evicts attacker-planted password credentials on never-verified rows.
  Google({
    allowDangerousEmailAccountLinking: true,
  }),

  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const email = (credentials.email as string).toLowerCase().trim();
      const password = credentials.password as string;

      // Shared (DB-backed) brute-force limiter: 10 failed attempts per
      // address per hour. Failed attempts are only recorded on failure,
      // so a legitimate user is never locked out by their own successes.
      const { count: recentFailures, error: attemptErr } = await getPublicClient()
        .from("rate_limit_events")
        .select("*", { count: "exact", head: true })
        .eq("key", `login:${email}`)
        .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (!attemptErr && (recentFailures ?? 0) >= MAX_LOGIN_ATTEMPTS_PER_HOUR) {
        return null;
      }

      const nextAuthClient = getNextAuthClient();
      const publicClient = getPublicClient();

      // 1. Find user in next_auth.users by email
      const { data: userRows, error: userErr } = await nextAuthClient
        .from("users")
        .select("id, email, name, image, emailVerified, credential_epoch")
        .eq("email", email)
        .limit(1);

      const user = !userErr && userRows && userRows.length > 0 ? userRows[0] : null;

      if (!user) return null;

      // 2. Accounts created via signup are unusable until the emailed
      //    confirmation code proves mailbox ownership.
      if (!user.emailVerified) return null;

      // 3. Check password hash in public.user_passwords
      const { data: pwRows, error: pwErr } = await publicClient
        .from("user_passwords")
        .select("password_hash")
        .eq("user_id", user.id)
        .limit(1);

      if (pwErr || !pwRows || pwRows.length === 0) {
        // User exists but has no password (Google-only user)
        return null;
      }

      const isValid = await bcrypt.compare(password, pwRows[0].password_hash);
      if (!isValid) {
        // Record the failure for the shared limiter (best-effort)
        await publicClient.from("rate_limit_events").insert({ key: `login:${email}` });
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        credential_epoch: Number(user.credential_epoch ?? 0),
      } as any;
    },
  }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers,
  adapter: SupabaseAdapter({
    url: supabaseUrl,
    secret: supabaseSecret,
  }),
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.email) {
        const nextAuthClient = getNextAuthClient();

        const { data: rows } = await nextAuthClient
          .from("users")
          .select("id, emailVerified")
          .eq("email", user.email.toLowerCase().trim())
          .limit(1);

        const row = rows && rows.length > 0 ? rows[0] : null;

        if (row && !row.emailVerified) {
          // The row was created via password signup but never verified —
          // the only password that can be on it belongs to whoever claimed
          // the email without proving ownership. Google's verification is
          // stronger proof, so evict the password, mark the email verified,
          // and let the real owner claim the account.
          await getPublicClient().from("user_passwords").delete().eq("user_id", row.id);
          await nextAuthClient
            .from("users")
            .update({ emailVerified: new Date().toISOString() })
            .eq("id", row.id);
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Client-side `useSession().update({ user: { image } })` after a
      // profile upload lands here — persist it so the new avatar survives.
      if (
        trigger === "update" &&
        (session as { user?: { image?: string | null } } | undefined)?.user?.image !== undefined
      ) {
        token.picture = (session as { user: { image: string | null } }).user.image;
      }
      if (user) {
        token.id = user.id;
        // Persist profile fields into the JWT so the session (and the
        // settings avatar) can render them. `image` comes from the
        // next_auth.users.image column (credentials) or Google (`picture`).
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
        token.picture =
          (user as any).image ?? (user as any).picture ?? token.picture;
      }

      // Enforce the per-user credential epoch: after a password reset
      // (or account deletion) every previously issued JWT goes stale.
      // A missing row counts as maximally stale.
      const userId = (user?.id as string | undefined) ?? (token.id as string | undefined);
      if (userId) {
        const { data: rows } = await getNextAuthClient()
          .from("users")
          .select("credential_epoch")
          .eq("id", userId)
          .limit(1);

        const currentEpoch =
          rows && rows.length > 0 ? Number(rows[0].credential_epoch ?? 0) : -1;

        if (user) {
          token.epoch = (user as any).credential_epoch ?? currentEpoch;
        } else if (token.epoch !== undefined && Number(token.epoch) !== currentEpoch) {
          // Force the session JWT to expire immediately.
          token.exp = Math.floor(Date.now() / 1000) - 60;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // Expose the persisted profile fields (image lives in
        // next_auth.users.image) to all `auth()` / `useSession()` callers.
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
        session.user.image =
          (token.picture as string | undefined) ??
          (token.image as string | undefined) ??
          null;
      }
      const signingSecret = process.env.SUPABASE_JWT_SECRET;
      if (signingSecret && token.sub) {
        const payload = {
          aud: "authenticated",
          exp: Math.floor(new Date(session.expires).getTime() / 1000),
          sub: token.sub,
          email: session.user.email,
          role: "authenticated",
        };
        session.supabaseAccessToken = jwt.sign(payload, signingSecret);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
