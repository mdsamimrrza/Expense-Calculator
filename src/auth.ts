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

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

const googleClientId =
  process.env.AUTH_GOOGLE_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_ID;

const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  process.env.GOOGLE_SECRET;

function once<T>(factory: () => T): () => T {
  let value: T | null = null;
  return () => (value ??= factory());
}

const getNextAuthClient = once(() =>
  createClient(supabaseUrl, supabaseSecret, {
    db: { schema: "next_auth" },
  })
);

const getPublicClient = once(() => createClient(supabaseUrl, supabaseSecret));

const EPOCH_CHECK_INTERVAL_MS = 5 * 60 * 1000;

const providers: Provider[] = [
  Google({
    ...(googleClientId ? { clientId: googleClientId } : {}),
    ...(googleClientSecret ? { clientSecret: googleClientSecret } : {}),
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

const nextAuth = NextAuth({
  ...authConfig,
  secret: authSecret,
  trustHost: true,
  providers,
  adapter: SupabaseAdapter({
    url: supabaseUrl,
    secret: supabaseSecret,
  }),
  callbacks: {
    async redirect({ url, baseUrl }) {
      const defaultOrigin = "https://sahakari-sip.vercel.app";
      const baseOrigin = (baseUrl && !baseUrl.includes("localhost:4000") ? baseUrl : defaultOrigin).replace(/\/+$/, "");

      // 1. Relative URLs
      if (url.startsWith("/")) {
        return `${baseOrigin}${url}`;
      }

      // 2. Absolute URLs
      try {
        const parsed = new URL(url);
        // If it's the mobile handoff relay, ALWAYS allow and ensure proper host
        if (parsed.pathname.startsWith("/api/mobile/handoff")) {
          const originToUse = parsed.origin.includes("localhost:4000") ? baseOrigin : parsed.origin;
          return `${originToUse}${parsed.pathname}${parsed.search}`;
        }
        // If it's a known domain or same origin
        if (
          parsed.origin === baseOrigin ||
          parsed.hostname.endsWith(".vercel.app") ||
          parsed.hostname === "localhost"
        ) {
          return url;
        }
      } catch {
        // Fallback
      }

      return `${baseOrigin}/dashboard`;
    },
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === "google" && user?.email) {
          const nextAuthClient = getNextAuthClient();

          const { data: rows } = await nextAuthClient
            .from("users")
            .select("id, name, image, emailVerified")
            .eq("email", user.email.toLowerCase().trim())
            .limit(1);

          const row = rows && rows.length > 0 ? rows[0] : null;

          if (row && !row.emailVerified) {
            await getPublicClient().from("user_passwords").delete().eq("user_id", row.id);
            await nextAuthClient
              .from("users")
              .update({ emailVerified: new Date().toISOString() })
              .eq("id", row.id);
          }

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
      } catch (err) {
        console.error("[signIn callback] non-fatal profile sync error:", err);
      }
      return true;
    },
    async jwt({ token, user, account, profile, trigger, session }) {
      try {
        if (
          trigger === "update" &&
          (session as { user?: { image?: string | null } } | undefined)?.user?.image !== undefined
        ) {
          token.picture = (session as { user: { image: string | null } }).user.image;
        }
        if (user) {
          token.id = user.id;
          token.name = user.name ?? token.name;
          token.email = user.email ?? token.email;
          token.picture =
            (profile as { picture?: string } | null)?.picture ??
            (user as any).image ??
            (user as any).picture ??
            token.picture;
        }

        const userId = (user?.id as string | undefined) ?? (token.id as string | undefined);
        if (userId) {
          const now = Date.now();
          const lastCheck = Number(token.epochCheckedAt ?? 0);
          const needsCheck = Boolean(user) || now - lastCheck >= EPOCH_CHECK_INTERVAL_MS;

          if (needsCheck) {
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
              token.exp = Math.floor(Date.now() / 1000) - 60;
            }
            token.epochCheckedAt = now;
          }
        }
      } catch (err) {
        console.error("[jwt callback] non-fatal error:", err);
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
        session.user.image =
          (token.picture as string | undefined) ??
          (token.image as string | undefined) ??
          null;
      }
      try {
        const signingSecret = process.env.SUPABASE_JWT_SECRET;
        if (signingSecret && token.sub) {
          const payload = {
            aud: "authenticated",
            exp: Math.floor(new Date(session.expires).getTime() / 1000),
            sub: token.sub,
            email: session.user.email,
            role: "authenticated",
            epoch: token.epoch ?? 0,
          };
          session.supabaseAccessToken = jwt.sign(payload, signingSecret);
        }
      } catch (err) {
        console.error("[session callback] signing token error:", err);
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
