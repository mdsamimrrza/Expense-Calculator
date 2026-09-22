import NextAuth from "next-auth";
import { cache } from "react";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import jwt from "jsonwebtoken";
import type { Provider } from "next-auth/providers";
import { authConfig } from "./auth.config";
import { createClient } from "@supabase/supabase-js";
import { verifyCredentials } from "./lib/credentials-core";

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

      // Shared core with the mobile API: brute-force limiter, emailVerified
      // gate, bcrypt compare — one implementation, no drift.
      const result = await verifyCredentials(
        credentials.email as string,
        credentials.password as string
      );
      if (!result.ok) return null;

      return {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        image: result.user.image,
        credential_epoch: result.credentialEpoch,
      } as any;
    },
  }),
];

// The jwt callback does a Supabase round trip (credential_epoch check) on
// every auth() call — and layout + page both call auth() in the same render.
// cache() dedupes them to one round trip per request without touching callers.
const nextAuth = NextAuth({
  ...authConfig,
  providers,
  adapter: SupabaseAdapter({
    url: supabaseUrl,
    secret: supabaseSecret,
  }),
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user?.email) {
        const nextAuthClient = getNextAuthClient();

        const { data: rows } = await nextAuthClient
          .from("users")
          .select("id, name, image, emailVerified")
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

        // Backfill the profile photo (and missing name) from Google.
        // A row created earlier via email/password signup has image = null,
        // and account linking never copies Google's picture into it — so a
        // Google login on such an account would leave the avatar empty.
        const googlePicture =
          (profile as { picture?: string } | null)?.picture ??
          (user as { image?: string | null }).image ??
          null;
        const googleName =
          (profile as { name?: string } | null)?.name ??
          (user as { name?: string | null }).name ??
          null;
        if (row && googlePicture && row.image !== googlePicture) {
          await nextAuthClient
            .from("users")
            .update({ image: googlePicture })
            .eq("id", row.id);
        }
        if (row && !row.name && googleName) {
          await nextAuthClient
            .from("users")
            .update({ name: googleName })
            .eq("id", row.id);
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile, trigger, session }) {
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
        // On a Google sign-in prefer the live profile picture: the linked
        // DB row may still hold the old null from an earlier password signup.
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
        token.picture =
          (profile as { picture?: string } | null)?.picture ??
          (user as any).image ??
          (user as any).picture ??
          token.picture;
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

export const { handlers, signIn, signOut } = nextAuth;
export const auth = cache(nextAuth.auth);
