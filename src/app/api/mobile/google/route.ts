// ============================================================
// SahakariSIP — Mobile Google sign-in kickoff
// ============================================================
// Two legs:
//
//  POST /api/mobile/google            (app leg, JSON)
//    The APK sends the random nonce it minted locally. We answer with
//    the browser URL to open: our own GET start route below.
//
//  GET  /api/mobile/google?nonce=...  (browser leg, 307)
//    Runs NextAuth's OAuth kickoff SERVER-SIDE — GET /api/auth/csrf to
//    mint the CSRF cookie, POST /api/auth/signin/google (form body,
//    csrfToken + callbackUrl → the handoff relay with the nonce) — and
//    forwards every Set-Cookie header on a 307 to Google. The phone's
//    browser carries the CSRF/state/nonce cookies as first-party on
//    this origin, so from here it's the exact same consent chain the
//    web app uses: Google → /api/auth/callback/google → NextAuth
//    session → relay → sahakarisip://auth/callback?token=<nonce>.
//
// Why not just GET /api/auth/signin/google? @auth/core only renders an
// HTML page for GET; the OAuth redirect requires a CSRF-validated POST
// that only its client-side signIn() sends. Doing the handshake here
// removes that extra click and keeps Google's registered redirect URIs
// untouched.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const APP_SCHEME = process.env.MOBILE_APP_SCHEME || "sahakarisip";

function webOrigin(): string {
  const explicit = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  return "https://sahakari-sip.vercel.app";
}

function isNonce(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{32}$/i.test(value);
}

// ---------- app leg ----------

export async function POST(req: NextRequest) {
  let body: { nonce?: string } | null = null;
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

  return NextResponse.json({
    url: `${webOrigin()}/api/mobile/google?nonce=${nonce}`,
    callbackScheme: `${APP_SCHEME}://`,
  });
}

// ---------- browser leg ----------

export async function GET(req: NextRequest) {
  const nonce = req.nextUrl.searchParams.get("nonce");
  if (!isNonce(nonce)) {
    return errorPage("Sign-in link invalid", 400);
  }

  const origin = webOrigin();
  // Prepare cookie string to forward
  const cookieStore = await cookies();
  const incomingCookie = cookieStore.toString();

  // 1. Get CSRF token and cookie
  const csrfRes = await fetch(`${origin}/api/auth/csrf`, {
    method: "GET",
    headers: {
      cookie: incomingCookie,
    },
  });
  if (!csrfRes.ok) {
    return errorPage("Google sign-in could not start. Please try again.", 502);
  }
  const csrfResCookie = csrfRes.headers.get("set-cookie") ?? "";
  const csrfJson = await csrfRes.json();
  const csrfToken = (csrfJson as { token?: string }).token ?? "";
  if (!csrfToken) {
    return errorPage("Google sign-in could not start. Please try again.", 502);
  }

  // Cookie jar for the second hop: incoming cookies plus the newly issued CSRF cookie.
  const cookieJar = [incomingCookie, csrfResCookie].filter(Boolean).join("; ");

  // 2. The actual OAuth kickoff: NextAuth's CSRF-validated POST.
  const relayUrl = `${origin}/api/mobile/handoff?nonce=${nonce}`;
  const form = new URLSearchParams({ csrfToken, callbackUrl: relayUrl });
  const signinRes = await fetch(`${origin}/api/auth/signin/google`, {
    method: "POST",
    headers: {
      cookie: cookieJar,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!signinRes.ok) {
    // No redirect (bad config / error page) – surface a friendly page
    // rather than a half-started flow.
    console.error("[mobile google] signin did not redirect; status", signinRes.status);
    return errorPage("Google sign-in could not start. Please try again.", 502);
  }

  const googleUrl = signinRes.headers.get("location");
  if (!googleUrl || !/^https:\/\//.test(googleUrl)) {
    return errorPage("Google sign-in could not start. Please try again.", 502);
  }

  // 3. Hand the browser the Google URL with all Set-Cookie headers from
  //    both hops, so CSRF/state/nonce cookies are first-party on this
  //    origin and ride along to the callback.
  const response = NextResponse.redirect(googleUrl, 307);
  // Append Set-Cookie from csrf response
  if (csrfResCookie) response.headers.append("set-cookie", csrfResCookie);
  // Append Set-Cookie from signin response
  const signinResCookie = signinRes.headers.get("set-cookie");
  if (signinResCookie) response.headers.append("set-cookie", signinResCookie);
  return response;
}

function errorPage(message: string, status: number): NextResponse {
  const body = `<html><body style="font-family:sans-serif;text-align:center;padding-top:20vh"><h2>${message}</h2><p>Please try Google sign-in again from the SahakariSIP app.</p></body></html>`;
  return new NextResponse(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
