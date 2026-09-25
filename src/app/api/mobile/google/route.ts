// ============================================================
// SahakariSIP - Mobile Google sign-in kickoff
// ============================================================
// Two legs:
//
//  POST /api/mobile/google            (app leg, JSON)
//    The APK/client sends the random nonce it minted locally, along with
//    optional redirect scheme/URL. We answer with the browser URL to open.
//
//  GET  /api/mobile/google?nonce=...  (browser leg, 307)
//    Runs NextAuth OAuth kickoff and forwards to Google OAuth with
//    callbackUrl = relative relay path carrying nonce & redirect.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";

const APP_SCHEME = process.env.MOBILE_APP_SCHEME || "sahakarisip";

function webOrigin(req?: NextRequest): string {
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  }
  const explicit = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (explicit && /^https:\/\/(?!localhost(?:[:/]|$)|127\.0\.0\.1(?:[:/]|$))/i.test(explicit)) {
    return explicit.replace(/\/+$/, "");
  }
  return "https://sahakari-sip.vercel.app";
}

function isNonce(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{32}$/i.test(value);
}

// ---------- app leg ----------

export async function POST(req: NextRequest) {
  let body: { nonce?: string; redirectUrl?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const nonce = isNonce(body?.nonce) ? body.nonce.toLowerCase() : null;
  if (!nonce) {
    return NextResponse.json(
      { error: "Invalid nonce (expected 32 hex characters)." },
      { status: 400 }
    );
  }

  const redirectParam = body?.redirectUrl ? `&redirect=${encodeURIComponent(body.redirectUrl)}` : "";

  return NextResponse.json({
    url: `${webOrigin(req)}/api/mobile/google?nonce=${nonce}${redirectParam}`,
    callbackScheme: `${APP_SCHEME}://`,
  });
}

// ---------- browser leg ----------

export async function GET(req: NextRequest) {
  const nonce = req.nextUrl.searchParams.get("nonce");
  const redirectUrl = req.nextUrl.searchParams.get("redirect") || `${APP_SCHEME}://auth/callback`;

  if (!isNonce(nonce)) {
    return errorPage("Sign-in link invalid", 400);
  }

  const origin = webOrigin(req);
  const host = req.headers.get("host") || new URL(origin).host;
  const incomingCookie = req.headers.get("cookie") ?? "";

  const forwardedHeaders: Record<string, string> = {
    host,
    "x-forwarded-host": host,
    "x-forwarded-proto": req.headers.get("x-forwarded-proto") || "https",
  };

  // Use a relative relay URL with nonce and target redirect
  const relayPath = `/api/mobile/handoff?nonce=${nonce}&redirect=${encodeURIComponent(redirectUrl)}`;

  // 1. Mint (or reuse) the CSRF cookie
  const csrfRes = await handlers.GET(
    new NextRequest(
      `${origin}/api/auth/csrf?callbackUrl=${encodeURIComponent(relayPath)}`,
      {
        headers: { ...forwardedHeaders, cookie: incomingCookie },
      }
    )
  );
  const csrfCookies = csrfRes.headers.getSetCookie();
  const csrfToken: string =
    ((await csrfRes.json().catch(() => null)) as { csrfToken?: string } | null)?.csrfToken ?? "";
  if (!csrfToken) {
    return errorPage("Google sign-in could not start. Please try again.", 502);
  }

  const cookieJar = [incomingCookie, ...csrfCookies].filter(Boolean).join("; ");

  // 2. OAuth kickoff POST with relative callbackUrl
  const form = new URLSearchParams({ csrfToken, callbackUrl: relayPath });
  const signinRes = await handlers.POST(
    new NextRequest(`${origin}/api/auth/signin/google`, {
      method: "POST",
      headers: {
        ...forwardedHeaders,
        cookie: cookieJar,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    })
  );

  const googleUrl = signinRes.headers.get("location");
  if (!googleUrl || !/^https:\/\//.test(googleUrl)) {
    console.error("[mobile google] signin did not redirect; status", signinRes.status);
    return errorPage("Google sign-in could not start. Please try again.", 502);
  }

  // 3. Hand browser the Google URL with cookies
  const response = NextResponse.redirect(googleUrl, 307);
  for (const cookie of csrfCookies) response.headers.append("set-cookie", cookie);
  for (const cookie of signinRes.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  response.cookies.set("mobile_handoff_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 600,
  });
  return response;
}

function errorPage(message: string, status: number): NextResponse {
  const body = `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding-top:20vh;background:#0B0F19;color:#EDEAE0"><h2>${message}</h2><p style="color:#94A3B8">Please try Google sign-in again from the SahakariSIP app.</p></body></html>`;
  return new NextResponse(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
