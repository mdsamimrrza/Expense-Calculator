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

  const currentValue = latestNav !== null ? totalUnits * latestNav : null;
  const gainLoss = currentValue !== null ? currentValue - totalInvested : null;
  const gainLossPct =
    gainLoss !== null && totalInvested > 0
      ? (gainLoss / totalInvested) * 100
      : null;

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
    gainLoss,
    gainLossPct,
    xirr,
    sipStreak,
    latestNav,
    latestNavDate,
  };

  // ---- Chart data ----

  // Portfolio value over time
  let cumulativeUnits = 0;
  let cumulativeInvested = 0;
  const portfolioChart: PortfolioChartPoint[] = entries.map((entry) => {
    cumulativeUnits += Number(entry.units);
    cumulativeInvested += Number(entry.amount);
    return {
      date: entry.purchase_date,
      portfolioValue: cumulativeUnits * Number(entry.nav),
      totalInvested: cumulativeInvested,
    };
  });

  // Monthly contributions
  const monthlyMap = new Map<string, number>();
  for (const entry of entries) {
    const monthKey = format(new Date(entry.purchase_date), "yyyy-MM");
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + Number(entry.amount));
  }
  const monthlyContributions: MonthlyContribution[] = Array.from(
    monthlyMap.entries()
  ).map(([month, amount]) => ({ month, amount }));

  // NAV history
  const navHistory: ChartDataPoint[] = entries.map((entry) => ({
    date: entry.purchase_date,
    value: Number(entry.nav),
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
