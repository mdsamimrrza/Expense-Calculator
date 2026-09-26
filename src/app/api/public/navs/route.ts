// ============================================================
// SahakariSIP - Public NAV feed (device-mode auto-update).
//
// GET /api/public/navs
//   Returns the LATEST published quote per fund from the shared
//   nav_reference series (written by /api/cron/fetch-nav).
//   No auth, no user data - just fund_key/nav_date/nav_value, so the
//   offline (device-mode) APK can auto-advance its local NAV values
//   without any account or identity attached to the request.
//
//   Cache-Control: 1h - the cron publishes daily; an hour of CDN
//   caching costs nothing and keeps this endpoint free to hammer.
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("nav_reference")
      .select("fund_key, nav_date, nav_value")
      .order("nav_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Newest-first rows: the first hit per fund_key is that fund's latest.
    const latest = new Map<
      string,
      { fund_key: string; nav_date: string; nav_value: number }
    >();
    for (const row of (data ?? []) as Array<{
      fund_key: string;
      nav_date: string;
      nav_value: number;
    }>) {
      if (!latest.has(row.fund_key)) latest.set(row.fund_key, row);
    }

    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        funds: [...latest.values()],
      },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch (err: any) {
    console.error("[GET /api/public/navs] error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
