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
    await issueHandoffToken(session.user.id);
  } catch {
    return htmlResponse(
      "Something went wrong",
      "Please try again from the SahakariSIP app.",
      500
    );
  }

  // You're signed in — back to the app.
  return NextResponse.redirect(`${APP_SCHEME}://auth/callback?token=${nonce}`);
}
