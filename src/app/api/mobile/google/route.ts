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
//    Runs NextAuth's OAuth kickoff IN-PROCESS — GET /api/auth/csrf to
//    mint the CSRF cookie, then the CSRF-validated POST to
//    /api/auth/signin/google with callbackUrl = the handoff relay that
//    carries the nonce — and forwards every Set-Cookie on a 307 to
//    Google. From there it's the exact chain the web app uses:
//    Google → /api/auth/callback/google → NextAuth session → relay →
//    sahakarisip://auth/callback?token=<nonce>.
//
// Why not just GET /api/auth/signin/google? @auth/core only renders an
// HTML page for GET; the OAuth redirect requires a CSRF-validated POST.
// Why handlers instead of self-fetching our own URL? On Vercel,
// server-side fetches to the app's own hostname can be intercepted by
// deployment protection — calling the exported NextAuth handlers with a
// crafted Request (browser's real Cookie header, host forwarded) keeps
// everything in-process and deterministic.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";

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
  // Preserve the real host so NextAuth's trustHost/url inference works
  // exactly like a browser request to this origin.
  const host = req.headers.get("host") || new URL(origin).host;
  const incomingCookie = req.headers.get("cookie") ?? "";

  const forwardedHeaders: Record<string, string> = {
    host,
    "x-forwarded-host": host,
    "x-forwarded-proto": req.headers.get("x-forwarded-proto") || "https",
  };

  // 1. Mint (or reuse) the CSRF cookie, exactly like the client lib does.
  const csrfRes = await handlers.GET(
    new NextRequest(`${origin}/api/auth/csrf`, {
      headers: { ...forwardedHeaders, cookie: incomingCookie },
    })
  );
  const csrfCookies = csrfRes.headers.getSetCookie();
  const csrfToken: string =
    ((await csrfRes.json().catch(() => null)) as { token?: string } | null)?.token ?? "";
  if (!csrfToken) {
    return errorPage("Google sign-in could not start. Please try again.", 502);
  }

  // Cookie jar for the second hop: whatever the browser already had plus
  // the freshly issued CSRF cookie.
  const cookieJar = [incomingCookie, ...csrfCookies].filter(Boolean).join("; ");

  // 2. The actual OAuth kickoff: NextAuth's CSRF-validated POST.
  const relayUrl = `${origin}/api/mobile/handoff?nonce=${nonce}`;
  const form = new URLSearchParams({ csrfToken, callbackUrl: relayUrl });
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
    // No redirect (bad config / error page) — surface a friendly page
    // rather than a half-started flow.
    console.error("[mobile google] signin did not redirect; status", signinRes.status);
    return errorPage("Google sign-in could not start. Please try again.", 502);
  }

  // 3. Hand the browser the Google URL with all Set-Cookie headers from
  //    both hops, so CSRF/state/nonce cookies are first-party on this
  //    origin and ride along to the callback.
  const response = NextResponse.redirect(googleUrl, 307);
  for (const cookie of csrfCookies) response.headers.append("set-cookie", cookie);
  for (const cookie of signinRes.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

function errorPage(message: string, status: number): NextResponse {
  const body = `<html><body style="font-family:sans-serif;text-align:center;padding-top:20vh"><h2>${message}</h2><p>Please try Google sign-in again from the SahakariSIP app.</p></body></html>`;
  return new NextResponse(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
