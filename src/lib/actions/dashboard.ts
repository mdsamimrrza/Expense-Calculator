"use server";

import { createClient } from "@/lib/supabase/server";
import { auth } from "@/auth";
import type {
  ActionResult,
  DashboardSummary,
  Entry,
  FundConfig,
  PortfolioChartPoint,
  MonthlyContribution,
  FeeDragPoint,
  ChartDataPoint,
} from "@/lib/types";
import { calculateXirr, buildCashFlows } from "@/lib/calculations/xirr";
import { calculateSipStreak } from "@/lib/calculations/streak";
import {
  prepareFeeDragEntries,
  calculateFeeDrag,
} from "@/lib/calculations/fee-drag";
import { XIRR_MIN_ENTRIES, DP_CHARGE } from "@/lib/constants";
import { getCapitalGainsStatus, CGT_NP_REDEMPTION } from "@/lib/tax";
import { format } from "date-fns";

interface DashboardData {
  summary: DashboardSummary;
  funds: FundConfig[];
  portfolioChart: PortfolioChartPoint[];
  monthlyContributions: MonthlyContribution[];
  navHistory: ChartDataPoint[];
  feeDragChart: FeeDragPoint[];
  entriesCount: number;
}

export async function getDashboardData(
  fundId?: string
): Promise<ActionResult<DashboardData>> {
  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Funds, entries and nav_history are independent - fetch them in one
  // parallel round trip instead of three sequential awaits.
  let entriesQuery = supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .order("purchase_date", { ascending: true });

  if (fundId && fundId !== "all") {
    entriesQuery = entriesQuery.eq("fund_id", fundId);
  }

  let navHistoryQuery = supabase
    .from("nav_history")
    .select("fund_id, nav_date, nav_value")
    .eq("user_id", user.id)
    .order("nav_date", { ascending: true });

  if (fundId && fundId !== "all") {
    navHistoryQuery = navHistoryQuery.eq("fund_id", fundId);
  }

  const [fundsRes, entriesRes, navRes] = await Promise.all([
    supabase
      .from("fund_config")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    entriesQuery,
    navHistoryQuery,
  ]);

  if (fundsRes.error) {
    return { success: false, error: fundsRes.error.message };
  }
  const funds = (fundsRes.data ?? []) as FundConfig[];

  const entriesRaw = entriesRes.data;
  const entriesError = entriesRes.error;

  if (entriesError) {
    return { success: false, error: entriesError.message };
  }

  const entries = (entriesRaw ?? []) as Entry[];

  // ---- Calculate summary ----

  const totalInvested = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalUnits = entries.reduce((sum, e) => sum + Number(e.units), 0);

  // Determine latest NAV for current value calculation
  let latestNav: number | null = null;
  let latestNavDate: string | null = null;

  if (fundId && fundId !== "all") {
    const fund = funds.find((f) => f.id === fundId);
    latestNav = fund?.latest_nav ? Number(fund.latest_nav) : null;
    latestNavDate = fund?.latest_nav_date ?? null;
  } else {
    // "All Funds" - use each fund's latest NAV for its units
    // For simplicity, calculate per-fund and sum
    let totalValue = 0;
    let hasAllNavs = true;

    for (const fund of funds) {
      if (!fund.latest_nav) {
        hasAllNavs = false;
        break;
      }
      const fundUnits = entries
        .filter((e) => e.fund_id === fund.id)
        .reduce((sum, e) => sum + Number(e.units), 0);
      totalValue += fundUnits * Number(fund.latest_nav);
    }

    if (hasAllNavs && funds.length > 0) {
      latestNav = totalUnits > 0 ? totalValue / totalUnits : null;
    }
  }

  // Calculate unallotted leftover cash across all entries (Chronological Rollover Wallet Balance)
  const fundRolloverMap = new Map<string, number>();
  const sortedEntries = [...entries].sort(
    (a, b) =>
      new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime() ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const e of sortedEntries) {
    const carried = fundRolloverMap.get(e.fund_id) || 0;
    const amt = Number(e.amount);
    const u = Number(e.units);
    const n = Number(e.nav);
    const dpFee = amt >= DP_CHARGE ? DP_CHARGE : 0;
    const net = Math.max(0, amt + carried - dpFee);
    const unitCost = u * n;
    const leftover = Math.max(0, net - unitCost);
    fundRolloverMap.set(e.fund_id, leftover);
  }

  const unallottedCash =
    fundId && fundId !== "all"
      ? fundRolloverMap.get(fundId) || 0
      : Array.from(fundRolloverMap.values()).reduce((sum, val) => sum + val, 0);


  // Pure Portfolio Value = totalUnits * latestNav (excluding rollover cash)
  const currentValue = latestNav !== null ? totalUnits * latestNav : null;
  // Effective Invested = Total Money Deposited minus Unallotted Rollover Wallet Cash
  const effectiveInvested = Math.max(0, totalInvested - unallottedCash);
  const gainLoss = currentValue !== null ? currentValue - effectiveInvested : null;
  const gainLossPct =
    gainLoss !== null && effectiveInvested > 0
      ? (gainLoss / effectiveInvested) * 100
      : null;

  // Per-fund latest NAV lookup - needed for per-lot valuation below, since
  // a blended/scalar NAV is only valid when exactly one fund is in view.
  const fundLatestNavMap = new Map<string, number>();
  for (const f of funds) {
    if (f.latest_nav) fundLatestNavMap.set(f.id, Number(f.latest_nav));
  }

  // Capital gains: VERIFIED since 2026-09-24 - FY 2083/84 statutory slab
  // (Finance Act 2083; see src/lib/tax.ts). Lots are aged into
  // long/short buckets and each bucket uses its own verified rate.
  const cgt = getCapitalGainsStatus();

  const LONG_TERM_DAYS = 365;
  const todayMs = Date.now();
  let longTermGainSum = 0;
  let shortTermGainSum = 0;
  for (const e of entries) {
    const nav = fundLatestNavMap.get(e.fund_id);
    if (!nav) continue;
    const lotGain = Number(e.units) * nav - Number(e.amount);
    if (lotGain <= 0) continue;
    const ageDays = (todayMs - new Date(e.purchase_date).getTime()) / 86400000;
    if (ageDays > LONG_TERM_DAYS) longTermGainSum += lotGain;
    else shortTermGainSum += lotGain;
  }
  const estimatedCgtLongTerm =
    (longTermGainSum * CGT_NP_REDEMPTION.longTermRatePct) / 100;
  const estimatedCgtShortTerm =
    (shortTermGainSum * CGT_NP_REDEMPTION.shortTermRatePct) / 100;

  // XIRR
  let xirr: number | null = null;
  if (entries.length >= XIRR_MIN_ENTRIES && currentValue !== null) {
    const cashFlows = buildCashFlows(entries, currentValue);
    xirr = calculateXirr(cashFlows);
  }


  // SIP Streak
  const sipStreak = calculateSipStreak(
    entries.map((e) => e.purchase_date)
  );

  const summary: DashboardSummary = {
    totalInvested,
    totalUnits,
    currentValue,
    unallottedCash,
    gainLoss,
    gainLossPct,
    cgtStatus: cgt.status,
    cgtMessage: cgt.status === "VERIFIED" ? null : cgt.message,
    estimatedCgtLongTerm,
    estimatedCgtShortTerm,
    cgtTaxableLongTerm: longTermGainSum,
    cgtTaxableShortTerm: shortTermGainSum,
    xirr,
    sipStreak,
    latestNav,
    latestNavDate,
  };

  // ---- Chart data ----

  // NAV history & Portfolio Value timeline - built PER FUND throughout,
  // because a blended/scalar NAV is only valid when exactly one fund is in
  // view. The previous version kept a single Map<date, nav> where, in
  // "All Funds" view, one fund's NAV entry could silently overwrite
  // another fund's entry on a shared date, and then multiplied ALL funds'
  // combined units by that one arbitrary NAV - producing a portfolio
  // value graph that was mathematically wrong the moment a second fund
  // was tracked. Fixed to track each fund's own units and NAV
  // independently, matching how the summary's "All Funds" currentValue is
  // already (correctly) computed above.

  const fundNavTimeline = new Map<string, Map<string, number>>(); // fundId -> date -> nav
  const ensureFundMap = (fid: string) => {
    if (!fundNavTimeline.has(fid)) fundNavTimeline.set(fid, new Map());
    return fundNavTimeline.get(fid)!;
  };

  // 1. Seed with entry purchase NAVs, each tagged to its own fund
  for (const entry of entries) {
    if (entry.purchase_date && entry.nav) {
      ensureFundMap(entry.fund_id).set(entry.purchase_date, Number(entry.nav));
    }
  }

  // 2. Overlay nav_history rows (fetched in the parallel batch above),
  //    each tagged to its own fund_id (never mixed)
  const navHistoryRows = navRes.data;
  if (navHistoryRows) {
    for (const row of navHistoryRows) {
      ensureFundMap(row.fund_id).set(row.nav_date, Number(row.nav_value));
    }
  }

  // 3. Ensure each fund's own latest NAV/date is included in ITS OWN map
  for (const f of funds) {
    if (f.latest_nav && f.latest_nav_date) {
      ensureFundMap(f.id).set(f.latest_nav_date, Number(f.latest_nav));
    }
  }

  // Combined timeline of every date anything happened, across every fund in view
  const timelineDates = Array.from(
    new Set([
      ...entries.map((e) => e.purchase_date),
      ...Array.from(fundNavTimeline.values()).flatMap((m) => Array.from(m.keys())),
    ])
  ).sort((a, b) => a.localeCompare(b));

  // Running state PER FUND - units accumulated and last-known NAV, each
  // tracked independently so one fund's price can never leak into another's.
  const runningUnitsByFund = new Map<string, number>();
  const lastKnownNavByFund = new Map<string, number>();
  for (const f of funds) {
    const firstEntry = entries
      .filter((e) => e.fund_id === f.id)
      .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))[0];
    if (firstEntry) lastKnownNavByFund.set(f.id, Number(firstEntry.nav));
    runningUnitsByFund.set(f.id, 0);
  }

  // Entries pre-bucketed by purchase_date: every entry's date is in
  // timelineDates, so each is applied exactly once on its own date.
  // (Re-filtering all entries per timeline date was O(dates × entries).)
  const entriesByDate = new Map<string, Entry[]>();
  for (const e of entries) {
    const bucket = entriesByDate.get(e.purchase_date);
    if (bucket) bucket.push(e);
    else entriesByDate.set(e.purchase_date, [e]);
  }

  const portfolioChart: PortfolioChartPoint[] = [];
  const blendedNavPoints: ChartDataPoint[] = []; // used only for "All Funds" NAV chart
  let runningInvested = 0;

  for (const dt of timelineDates) {
    for (const e of entriesByDate.get(dt) ?? []) {
      runningUnitsByFund.set(e.fund_id, (runningUnitsByFund.get(e.fund_id) || 0) + Number(e.units));
      runningInvested += Number(e.amount);
    }

    // Update each fund's own last-known NAV independently
    for (const [fid, fundMap] of fundNavTimeline.entries()) {
      if (fundMap.has(dt)) {
        lastKnownNavByFund.set(fid, fundMap.get(dt)!);
      }
    }

    let portfolioValue = 0;
    let totalUnitsAtDate = 0;
    for (const f of funds) {
      const units = runningUnitsByFund.get(f.id) || 0;
      const nav = lastKnownNavByFund.get(f.id) || 0;
      portfolioValue += units * nav;
      totalUnitsAtDate += units;
    }

    portfolioChart.push({
      date: dt,
      portfolioValue,
      totalInvested: runningInvested,
    });

    if (totalUnitsAtDate > 0) {
      blendedNavPoints.push({ date: dt, value: portfolioValue / totalUnitsAtDate });
    }
  }

  // NAV history chart: a single selected fund shows its own real NAV
  // series. "All Funds" has no single meaningful NAV to show (different
  // funds trade at unrelated price levels), so it shows the weighted
  // blended per-unit value of the combined position instead of one fund's
  // price silently overwriting another's on a shared date.
  const navHistory: ChartDataPoint[] =
    fundId && fundId !== "all"
      ? Array.from((fundNavTimeline.get(fundId) ?? new Map()).entries())
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => a.date.localeCompare(b.date))
      : blendedNavPoints;

  // Monthly contributions
  const monthlyMap = new Map<string, { total: number; breakdownMap: Map<string, number> }>();
  for (const entry of entries) {
    const monthKey = entry.purchase_date ? entry.purchase_date.substring(0, 7) : "";
    if (monthKey) {
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { total: 0, breakdownMap: new Map() });
      }
      const mData = monthlyMap.get(monthKey)!;
      mData.total += Number(entry.amount);

      const fundName = funds.find((f) => f.id === entry.fund_id)?.fund_name || "Unknown Fund";
      mData.breakdownMap.set(fundName, (mData.breakdownMap.get(fundName) || 0) + Number(entry.amount));
    }
  }
  const monthlyContributions: MonthlyContribution[] = Array.from(
    monthlyMap.entries()
  ).map(([month, mData]) => ({ 
    month, 
    amount: mData.total,
    breakdown: Array.from(mData.breakdownMap.entries()).map(([fundName, amount]) => ({ fundName, amount }))
  }));

  // Fee drag
  const feeRatePct =
    fundId && fundId !== "all"
      ? Number(funds.find((f) => f.id === fundId)?.fee_rate_pct ?? 0)
      : funds.length > 0
        ? funds.reduce((sum, f) => sum + Number(f.fee_rate_pct), 0) / funds.length
        : 0;

  const feeDragEntries = prepareFeeDragEntries(
    entries.map((e) => ({
      purchase_date: e.purchase_date,
      nav: Number(e.nav),
      units: Number(e.units),
    }))
  );
  const feeDragChart = calculateFeeDrag(feeDragEntries, feeRatePct);


  return {
    success: true,
    data: {
      summary,
      funds,
      portfolioChart,
      monthlyContributions,
      navHistory,
      feeDragChart,
      entriesCount: entries.length,
    },
  };
}
