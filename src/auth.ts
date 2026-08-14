import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import jwt from "jsonwebtoken";
import type { Provider } from "next-auth/providers";
import { authConfig } from "./auth.config";
import { createTransport } from "nodemailer";

declare module "next-auth" {
  interface Session {
    supabaseAccessToken?: string;
  }
}

// Custom branded HTML email sender for SahakariSIP
async function sendVerificationRequest(params: any) {
  const { identifier, url, provider } = params;

  const transport = createTransport(provider.server);
  const result = await transport.sendMail({
    to: identifier,
    from: provider.from,
    subject: `🔐 Sign in to SahakariSIP`,
    text: `Sign in to SahakariSIP: ${url}\n\n`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sign in to SahakariSIP</title>
        </head>
        <body style="background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px; color: #f8fafc;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
            <!-- Header Banner -->
            <tr>
              <td style="background-color: #0f172a; padding: 28px; text-align: center; border-bottom: 1px solid #334155;">
                <div style="font-size: 22px; font-weight: 900; color: #10b981; letter-spacing: -0.5px;">
                  📊 Sahakari<span style="color: #f59e0b;">SIP</span>
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; font-weight: 600; text-transform: uppercase; tracking: 1px;">
                  Mutual Fund Portfolio Ledger
                </div>
              </td>
            </tr>
            <!-- Content Area -->
            <tr>
              <td style="padding: 36px 32px; text-align: center;">
                <h1 style="font-size: 18px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0;">Sign in to your account</h1>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 28px 0;">
                  Click the button below to securely access your portfolio dashboard, fee analytics, and tax audit records.
                </p>
                <!-- CTA Button -->
                <a href="${url}" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; font-weight: 800; font-size: 14px; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                  Sign in to SahakariSIP →
                </a>
                <p style="font-size: 11px; color: #f59e0b; font-weight: 600; margin-top: 24px; margin-bottom: 4px; line-height: 1.5;">
                  ⏱️ This sign-in link is valid for 30 minutes only.
                </p>
                <p style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.5;">
                  If you didn't request this email, you can safely ignore it.
                </p>
              </td>
            </tr>
            <!-- Footer -->
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

  const failed = (result.rejected || []).filter(Boolean);
  if (failed.length) {
    throw new Error(`Email (${failed.join(", ")}) could not be sent`);
  }
}

const providers: Provider[] = [Google];

if (process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD) {
  providers.push(
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      maxAge: 30 * 60, // 30 minutes expiration
      sendVerificationRequest,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers,
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
});
