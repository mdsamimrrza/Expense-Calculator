"use server";

import { createClient } from "@/lib/supabase/server";
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

  // Fetch fund configs
  const { data: fundsRaw, error: fundsError } = await supabase
    .from("fund_config")
    .select("*")
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
    const dpFee = amt >= 5 ? 5 : 0;
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

  const estimatedCgtLongTerm =
    gainLoss !== null && gainLoss > 0 ? gainLoss * 0.075 : 0;
  const estimatedCgtShortTerm =
    gainLoss !== null && gainLoss > 0 ? gainLoss * 0.10 : 0;

  // XIRR
  let xirr: number | null = null;
  if (entries.length >= 2 && currentValue !== null) {
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

  // NAV history — combine entry purchase NAVs and nav_history updates into a unified timeline
  const combinedNavMap = new Map<string, number>();

  // 1. First add entry purchase NAVs from all SIP entries
  for (const entry of entries) {
    if (entry.purchase_date && entry.nav) {
      combinedNavMap.set(entry.purchase_date, Number(entry.nav));
    }
  }

  // 2. Overlay nav_history table rows
  if (fundId && fundId !== "all") {
    const { data: navHistoryRows } = await supabase
      .from("nav_history")
      .select("nav_date, nav_value")
      .eq("fund_id", fundId)
      .order("nav_date", { ascending: true });

    if (navHistoryRows) {
      for (const row of navHistoryRows) {
        combinedNavMap.set(row.nav_date, Number(row.nav_value));
      }
    }
  } else {
    const { data: navHistoryRows } = await supabase
      .from("nav_history")
      .select("nav_date, nav_value")
      .order("nav_date", { ascending: true });

    if (navHistoryRows) {
      for (const row of navHistoryRows) {
        combinedNavMap.set(row.nav_date, Number(row.nav_value));
      }
    }
  }

  // 3. Ensure latestNav and latestNavDate are included
  if (latestNav !== null && latestNavDate) {
    combinedNavMap.set(latestNavDate, latestNav);
  }

  const navHistory: ChartDataPoint[] = Array.from(combinedNavMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));


  // Build Portfolio Value timeline reflecting both SIP entries and NAV history updates
  const timelineDates = Array.from(
    new Set([
      ...entries.map((e) => e.purchase_date),
      ...navHistory.map((h) => h.date),
    ])
  ).sort((a, b) => a.localeCompare(b));

  const navMap = new Map<string, number>();
  for (const h of navHistory) {
    navMap.set(h.date, h.value);
  }

  let runningUnits = 0;
  let runningInvested = 0;
  let lastKnownNav = entries.length > 0 ? Number(entries[0].nav) : 10;

  const portfolioChart: PortfolioChartPoint[] = [];

  // Track entries processed so far to accumulate units & invested up to each date
  const processedEntryIds = new Set<string>();

  for (const dt of timelineDates) {
    const entriesOnDate = entries.filter(
      (e) => e.purchase_date <= dt && !processedEntryIds.has(e.id)
    );
    for (const e of entriesOnDate) {
      runningUnits += Number(e.units);
      runningInvested += Number(e.amount);
      processedEntryIds.add(e.id);
    }

    if (navMap.has(dt)) {
      lastKnownNav = navMap.get(dt)!;
    }

    portfolioChart.push({
      date: dt,
      portfolioValue: runningUnits * lastKnownNav,
      totalInvested: runningInvested,
    });
  }

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
