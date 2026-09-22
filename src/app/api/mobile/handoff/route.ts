// ============================================================
// GET /api/mobile/handoff?nonce=... — relay page (browser leg)
// ============================================================
// Landing target of the Google OAuth chain for mobile sign-ins. At
// this point NextAuth has created a session in the phone's browser
// (custom tab). This route binds the phone's nonce to THAT session
// (only the account that just signed in can mint the handoff) and
// bounces the browser to sahakarisip://auth/callback?token=<nonce>,
// which reopens the APK. openAuthSessionAsync captures the scheme URL.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { issueHandoffToken } from "../handoff-core";

const APP_SCHEME = process.env.MOBILE_APP_SCHEME || "sahakarisip";

function htmlResponse(heading: string, message: string, status: number) {
  const body = `<html><body style="font-family:sans-serif;text-align:center;padding-top:20vh"><h2>${heading}</h2><p>${message}</p></body></html>`;
  return new NextResponse(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: NextRequest) {
  const nonce = req.nextUrl.searchParams.get("nonce");

  if (!nonce || !/^[0-9a-f]{32}$/i.test(nonce)) {
    return htmlResponse(
      "Sign-in link invalid",
      "Please start Google sign-in again from the SahakariSIP app.",
      400
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    // OAuth completed but no session (e.g. provider error) — do not
    // mint anything. The app's wait loop times out honestly.
    return htmlResponse(
      "Google sign-in did not complete",
      "Please try again from the SahakariSIP app.",
      401
    );
  }

  try {
    await issueHandoffToken(session.user.id, nonce);
  } catch {
    return htmlResponse(
      "Something went wrong",
      "Please try again from the SahakariSIP app.",
      500
    );
  }

  const deepLink = `${APP_SCHEME}://auth/callback?token=${nonce}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Returning to SahakariSIP...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0b0f19;
      color: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 380px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .icon {
      width: 56px;
      height: 56px;
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px auto;
      font-size: 28px;
    }
    h2 {
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 700;
    }
    p {
      margin: 0 0 24px 0;
      color: #9ca3af;
      font-size: 14px;
      line-height: 1.5;
    }
    .btn {
      display: block;
      background: #3b82f6;
      color: #ffffff;
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      padding: 14px 20px;
      border-radius: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h2>Sign-in Successful!</h2>
    <p>Redirecting back to the SahakariSIP app...</p>
    <a id="app-link" href="${deepLink}" class="btn">Open SahakariSIP App</a>
  </div>
  <script>
    const link = "${deepLink}";
    window.location.href = link;
    setTimeout(function() {
      window.location.replace(link);
    }, 250);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
