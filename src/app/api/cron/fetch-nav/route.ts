// ============================================================
// SahakariSIP - Nightly NAV auto-fetch cron.
//
// Fetches the latest published NAV for EXACTLY the funds each
// user has configured (a fund whose name doesn't match a known
// source is skipped - sources are never guessed), and writes
// them to the shared Supabase tables so the web app and the
// APK both see the same data.
//
//   GET/POST /api/cron/fetch-nav           → latest NAV only
//   GET/POST /api/cron/fetch-nav?backfill=1 → + full history
//
// Auth: Authorization: Bearer <CRON_SECRET> (same as reminders).
// Schedule: vercel.json → 13:00 UTC (18:45 NPT), Sun-Thu,
// matching when Nepali fund managers publish NAVs.
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveFundSource, type ResolvedFundSource } from "@/lib/nav-sources/sources";
import type { NavQuote } from "@/lib/nav-sources/types";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { nepalTodayAD } from "@/lib/calendar/bs";

interface FundRow {
  id: string;
  user_id: string;
  fund_name: string;
  latest_nav: number | null;
  latest_nav_date: string | null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function GET(req: Request) {
  return handleCronFetchNav(req);
}

export async function POST(req: Request) {
  return handleCronFetchNav(req);
}

async function handleCronFetchNav(req: Request) {
  try {
    // 1. Verify Cron Secret (same convention as /api/cron/reminders).
    //    Fails closed when CRON_SECRET is unset.
    if (!isAuthorizedCronRequest(req)) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const backfill = new URL(req.url).searchParams.get("backfill") === "1";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. All active funds, resolved to their NAV source
    const { data: funds, error: fundsErr } = await supabase
      .from("fund_config")
      .select("id, user_id, fund_name, latest_nav, latest_nav_date")
      .eq("is_active", true);

    if (fundsErr) {
      return NextResponse.json({ error: fundsErr.message }, { status: 500 });
    }

    const matched: Array<{ fund: FundRow; source: ResolvedFundSource }> = [];
    const unmatchedNames: string[] = [];

    for (const fund of (funds ?? []) as FundRow[]) {
      const source = resolveFundSource(fund.fund_name);
      if (source) {
        matched.push({ fund, source });
      } else {
        unmatchedNames.push(fund.fund_name);
      }
    }

    // 3. Fetch each unique (source, code) once, no matter how
    //    many users have configured the same fund.
    const codeKey = (source: string, code: string) => `${source}:${code}`;
    const neededCodes = new Map<string, { source: ResolvedFundSource; code: string }>();
    for (const { source } of matched) {
      const key = codeKey(source.source, source.code);
      if (!neededCodes.has(key)) neededCodes.set(key, { source, code: source.code });
    }

    const latestQuotes = new Map<string, NavQuote | null>();
    const historyQuotes = new Map<string, NavQuote[]>();
    const sourceErrors: Array<{ source: string; code: string; error: string }> = [];

    // Each unique (source, code) maps to the normalized fund names that
    // use it - one fetch feeds every user of that fund through the shared
    // nav_reference series.
    const normalizeFundKey = (name: string) => name.trim().toLowerCase();
    const fundKeysByCode = new Map<string, Set<string>>();
    for (const { fund, source } of matched) {
      const key = codeKey(source.source, source.code);
      const set = fundKeysByCode.get(key) ?? new Set<string>();
      set.add(normalizeFundKey(fund.fund_name));
      fundKeysByCode.set(key, set);
    }

    await Promise.all(
      Array.from(neededCodes.entries()).map(async ([key, { source, code }]) => {
        try {
          latestQuotes.set(key, await source.adapter.fetchLatest(code));
          if (backfill) {
            historyQuotes.set(key, await source.adapter.fetchHistory(code));
          }
        } catch (err: any) {
          sourceErrors.push({
            source: source.label,
            code,
            error: err?.message || String(err),
          });
        }
      })
    );

    // 4. Write per fund: history (backfill) + latest, then advance
    //    fund_config.latest_nav only if the fetched date is newer.
    //
    //    Upstream data is only shape-validated by the adapters, so apply
    //    plausibility bounds before anything is persisted: NAV must be a
    //    positive, sane number and the quote must not be dated in the
    //    future (a format-valid future date would otherwise permanently
    //    win the "newer quote" comparison and freeze all later updates).
    let quotesUpserted = 0;
    let latestUpdated = 0;
    let rejectedQuotes = 0;
    const upsertErrors: string[] = [];
    const referenceWritten = new Set<string>();
    const todayStr = nepalTodayAD();

    const isPlausible = (q: NavQuote) =>
      Number.isFinite(q.nav) && q.nav > 0 && q.nav <= 1_000_000 && q.date <= todayStr;

    for (const { fund, source } of matched) {
      const key = codeKey(source.source, source.code);
      if (sourceErrors.some((e) => codeKey(e.source, e.code) === key)) continue;

      const quotes: NavQuote[] = [];
      if (backfill && historyQuotes.has(key)) {
        quotes.push(...(historyQuotes.get(key) ?? []));
      }
      const latest = latestQuotes.get(key);
      if (latest && !quotes.some((q) => q.date === latest.date)) {
        quotes.push(latest);
      }
      if (quotes.length === 0) continue;

      const plausibleQuotes = quotes.filter((q) => {
        if (isPlausible(q)) return true;
        rejectedQuotes++;
        return false;
      });
      if (plausibleQuotes.length === 0) continue;

      // nav_reference: ONE shared series per fund - upserted once per
      // (fund_key, nav_date) and read by every user. The cron no longer
      // writes per-user nav_history rows, so the table stops growing
      // with the user count. (User-entered NAV points still live in
      // nav_history, written by the app itself.)
      // The loop below runs per user's fund row; the reference write is
      // guarded so each unique source code writes exactly once.
      if (!referenceWritten.has(key)) {
        referenceWritten.add(key);
        const fundKeys = fundKeysByCode.get(key) ?? [];
        for (const fundKey of fundKeys) {
          for (const batch of chunk(plausibleQuotes, 500)) {
            const rows = batch.map((q) => ({
              fund_key: fundKey,
              nav_date: q.date,
              nav_value: q.nav,
              source: source.source,
            }));
            const { error } = await supabase
              .from("nav_reference")
              .upsert(rows, { onConflict: "fund_key,nav_date" });
            if (error) {
              // Surface the failure instead of swallowing it - a CHECK
              // violation here means the data written for this fund is bad.
              console.error("[fetch-nav] nav_reference upsert error:", error.message);
              if (upsertErrors.length < 20) {
                upsertErrors.push(`${fund.fund_name}: ${error.message}`);
              }
            } else {
              quotesUpserted += rows.length;
            }
          }
        }
      }

      const newest = plausibleQuotes.reduce((a, b) => (b.date > a.date ? b : a));
      const currentDate = fund.latest_nav_date;
      if (!currentDate || newest.date > currentDate) {
        const { error } = await supabase
          .from("fund_config")
          .update({ latest_nav: newest.nav, latest_nav_date: newest.date })
          .eq("id", fund.id);
        if (error) {
          console.error("[fetch-nav] fund_config update error:", error.message);
          if (upsertErrors.length < 20) {
            upsertErrors.push(`${fund.fund_name} (latest_nav): ${error.message}`);
          }
        } else {
          latestUpdated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      backfill,
      fundsConsidered: (funds ?? []).length,
      fundsMatched: matched.length,
      fundsSkipped: unmatchedNames.length,
      skippedFundNames: unmatchedNames,
      sourcesFetched: neededCodes.size - sourceErrors.length,
      quotesUpserted,
      latestUpdated,
      rejectedQuotes,
      upsertErrors,
      sourceErrors,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[CRON /api/cron/fetch-nav] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
