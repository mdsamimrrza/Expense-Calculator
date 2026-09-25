import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  providers: [],
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
