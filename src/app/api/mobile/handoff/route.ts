// ============================================================
// GET /api/mobile/handoff?nonce=... - relay page (browser leg)
// ============================================================
// Landing target of the Google OAuth chain for mobile sign-ins. At
// this point NextAuth has created a session in the phone's browser
// (custom tab). This route binds the phone's nonce to THAT session
// and bounces the browser to the target callback URL (e.g.
// sahakarisip://auth/callback?token=<nonce> or localhost for web).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { issueHandoffToken } from "../handoff-core";

const APP_SCHEME = process.env.MOBILE_APP_SCHEME || "sahakarisip";

function htmlResponse(heading: string, message: string, status: number) {
  const body = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading} - SahakariSIP</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0F19; color: #EDEAE0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; box-sizing: border-box; }
    .card { background: #151C2C; padding: 32px 24px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); max-width: 400px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h2 { font-size: 20px; margin: 0 0 10px; color: #EDEAE0; }
    p { font-size: 14px; color: #94A3B8; margin: 0 0 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${heading}</h2>
    <p>${message}</p>
  </div>
</body>
</html>`;
  return new NextResponse(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function redirectHtmlResponse(deepLink: string) {
  const isWebUrl = /^https?:\/\//i.test(deepLink);
  const btnLabel = isWebUrl ? "Continue to SahakariSIP" : "Open SahakariSIP App";

  const body = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${deepLink}" />
  <title>Completing Sign-In - SahakariSIP</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0F19; color: #EDEAE0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; box-sizing: border-box; }
    .card { background: #151C2C; padding: 32px 24px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); max-width: 400px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .spinner { width: 44px; height: 44px; border: 3px solid rgba(46,107,79,0.2); border-top-color: #2E6B4F; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 20px; margin: 0 0 10px; color: #EDEAE0; }
    p { font-size: 14px; color: #94A3B8; margin: 0 0 24px; line-height: 1.5; }
    .btn { display: inline-block; background: #2E6B4F; color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; transition: background 0.2s; }
    .btn:active { background: #23523C; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Redirecting to App</h2>
    <p>Sign-in successful. Returning you to SahakariSIP...</p>
    <a href="${deepLink}" id="launch-btn" class="btn">${btnLabel}</a>
  </div>
  <script>
    (function() {
      var target = ${JSON.stringify(deepLink)};
      try {
        window.location.replace(target);
      } catch (e) {}
      setTimeout(function() {
        var btn = document.getElementById("launch-btn");
        if (btn) {
          try { btn.click(); } catch (e) {}
        }
      }, 300);
    })();
  </script>
</body>
</html>`;
  return body;
}

export async function GET(req: NextRequest) {
  const nonce = req.nextUrl.searchParams.get("nonce");
  const redirectTarget = req.nextUrl.searchParams.get("redirect") || `${APP_SCHEME}://auth/callback`;
  const cookieNonce = req.cookies.get("mobile_handoff_nonce")?.value;

  if (!nonce || !/^[0-9a-f]{32}$/i.test(nonce)) {
    return htmlResponse(
      "Sign-in link invalid",
      "Please start Google sign-in again from the SahakariSIP app.",
      400
    );
  }

  // Nonce validation: if cookie is present, ensure match.
  if (cookieNonce && cookieNonce.toLowerCase() !== nonce.toLowerCase()) {
    return htmlResponse(
      "Sign-in link mismatch",
      "Please start Google sign-in again from the SahakariSIP app.",
      400
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return htmlResponse(
      "Google sign-in did not complete",
      "Please try again from the SahakariSIP app.",
      401
    );
  }

  try {
    // The APK exchanges the nonce it created at sign-in start.
    await issueHandoffToken(session.user.id, nonce);
  } catch (err) {
    console.error("[mobile handoff] issue token error:", err);
    return htmlResponse(
      "Something went wrong",
      "Please try again from the SahakariSIP app.",
      500
    );
  }

  const separator = redirectTarget.includes("?") ? "&" : "?";
  const deepLink = `${redirectTarget}${separator}token=${nonce}`;

  // Deliver both Location header with HTTP 307 Redirect and auto-launching HTML fallback page
  const html = redirectHtmlResponse(deepLink);
  const response = new NextResponse(html, {
    status: 307,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "location": deepLink,
    },
  });

  // Clear the nonce binding cookie now that it's consumed.
  response.cookies.set("mobile_handoff_nonce", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });

  return response;
}
