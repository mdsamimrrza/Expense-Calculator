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
import { format } from "date-fns";

interface DashboardData {
  summary: DashboardSummary;
  funds: FundConfig[];
  portfolioChart: PortfolioChartPoint[];
  monthlyContributions: MonthlyContribution[];
  navHistory: ChartDataPoint[];
  feeDragChart: FeeDragPoint[];
  entries: Entry[];
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

  // Fetch fund configs
  const { data: fundsRaw, error: fundsError } = await supabase
    .from("fund_config")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (fundsError) {
    return { success: false, error: fundsError.message };
  }

  const funds = (fundsRaw ?? []) as FundConfig[];

  // Fetch entries
  let entriesQuery = supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .order("purchase_date", { ascending: true });

  if (fundId && fundId !== "all") {
    entriesQuery = entriesQuery.eq("fund_id", fundId);
  }

  const { data: entriesRaw, error: entriesError } = await entriesQuery;

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
    // "All Funds" — use each fund's latest NAV for its units
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

  const unallottedCash = fundId
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

  // Per-fund latest NAV lookup — needed for per-lot valuation below, since
  // a blended/scalar NAV is only valid when exactly one fund is in view.
  const fundLatestNavMap = new Map<string, number>();
  for (const f of funds) {
    if (f.latest_nav) fundLatestNavMap.set(f.id, Number(f.latest_nav));
  }

  // Capital Gains Tax — Nepal IRD taxes each LOT of units separately based
  // on THAT lot's own holding period (> 365 days = long-term @ 7.5%, else
  // short-term @ 10%), not the portfolio's total gain at both rates at
  // once. Every entry is its own lot with its own purchase date and cost.
  const todayMs = Date.now();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  let longTermGainSum = 0;
  let shortTermGainSum = 0;

  for (const e of entries) {
    const fundNav = fundLatestNavMap.get(e.fund_id);
    if (fundNav === undefined) continue; // Can't value this lot without a current NAV

    const lotCostBasis = Number(e.amount);
    const lotCurrentValue = Number(e.units) * fundNav;
    const lotGain = lotCurrentValue - lotCostBasis;

    const purchaseMs = new Date(e.purchase_date).getTime();
    const daysHeld = (todayMs - purchaseMs) / MS_PER_DAY;

    if (daysHeld > 365) {
      longTermGainSum += lotGain;
    } else {
      shortTermGainSum += lotGain;
    }
  }

  // Tax applies only to NET positive gain within each bucket — a losing
  // lot offsets gains within the same bucket, but each bucket is taxed
  // once, at its own rate, never both rates on the same rupee of gain.
  const estimatedCgtLongTerm = longTermGainSum > 0 ? longTermGainSum * 0.075 : 0;
  const estimatedCgtShortTerm = shortTermGainSum > 0 ? shortTermGainSum * 0.10 : 0;

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
    estimatedCgtLongTerm,
    estimatedCgtShortTerm,
    xirr,
    sipStreak,
    latestNav,
    latestNavDate,
  };

  // ---- Chart data ----

  // NAV history & Portfolio Value timeline — built PER FUND throughout,
  // because a blended/scalar NAV is only valid when exactly one fund is in
  // view. The previous version kept a single Map<date, nav> where, in
  // "All Funds" view, one fund's NAV entry could silently overwrite
  // another fund's entry on a shared date, and then multiplied ALL funds'
  // combined units by that one arbitrary NAV — producing a portfolio
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

  // 2. Overlay nav_history rows, each tagged to its own fund_id (never mixed)
  let navHistoryQuery = supabase
    .from("nav_history")
    .select("fund_id, nav_date, nav_value")
    .eq("user_id", user.id)
    .order("nav_date", { ascending: true });

  if (fundId && fundId !== "all") {
    navHistoryQuery = navHistoryQuery.eq("fund_id", fundId);
  }

  const { data: navHistoryRows } = await navHistoryQuery;
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

  // Running state PER FUND — units accumulated and last-known NAV, each
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

  const processedEntryIds = new Set<string>();
  const portfolioChart: PortfolioChartPoint[] = [];
  const blendedNavPoints: ChartDataPoint[] = []; // used only for "All Funds" NAV chart
  let runningInvested = 0;

  for (const dt of timelineDates) {
    const entriesOnDate = entries.filter(
      (e) => e.purchase_date <= dt && !processedEntryIds.has(e.id)
    );
    for (const e of entriesOnDate) {
      runningUnitsByFund.set(e.fund_id, (runningUnitsByFund.get(e.fund_id) || 0) + Number(e.units));
      runningInvested += Number(e.amount);
      processedEntryIds.add(e.id);
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
      entries,
    },
  };
}
