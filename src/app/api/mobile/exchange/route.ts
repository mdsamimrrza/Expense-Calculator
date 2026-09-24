// ============================================================
// POST /api/mobile/exchange { nonce } - app leg
// ============================================================
// The APK calls this once it has captured the handoff token from the
// sahakarisip:// redirect. Consumes the single-use 60-second nonce and
// returns the user identity plus the Supabase RLS JWT.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { consumeHandoffToken } from "../handoff-core";

export async function POST(req: NextRequest) {
  let body: { nonce?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const nonce = typeof body?.nonce === "string" ? body.nonce : "";
  if (!/^[0-9a-f]{32}$/i.test(nonce)) {
    return NextResponse.json({ error: "Invalid handoff token." }, { status: 400 });
  }

  const result = await consumeHandoffToken(nonce);
  if (!result) {
    return NextResponse.json(
      { error: "Handoff token is expired or already used. Please sign in again." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: { id: result.userId, email: result.email, name: result.name, image: result.image },
    access_token: result.accessToken,
    expires_in: result.expiresIn,
  });
}
