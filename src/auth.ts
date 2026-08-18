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

// Service-role client for reading next_auth schema tables
function getServiceClient() {
  return createClient(supabaseUrl, supabaseSecret, {
    db: { schema: "next_auth" },
  });
}

const providers: Provider[] = [
  Google,

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

      const supabase = getServiceClient();

      // 1. Find user in next_auth.users by email
      const { data: userRows, error: userErr } = await supabase
        .from("users")
        .select("id, email, name, image")
        .eq("email", email)
        .limit(1);

      if (userErr || !userRows || userRows.length === 0) return null;

      const user = userRows[0];

      // 2. Check password hash in next_auth.user_passwords
      const { data: pwRows, error: pwErr } = await supabase
        .from("user_passwords")
        .select("password_hash")
        .eq("user_id", user.id)
        .limit(1);

      if (pwErr || !pwRows || pwRows.length === 0) {
        // User exists but has no password (Google-only user)
        return null;
      }

      const isValid = await bcrypt.compare(password, pwRows[0].password_hash);
      if (!isValid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
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
