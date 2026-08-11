"use client";

import { useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Coins,
  Flame,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardSummary, PortfolioChartPoint, ChartDataPoint, FundConfig } from "@/lib/types";
import {
  formatCurrencyWhole,
  formatPercentage,
  formatUnits,
  formatStreak,
  formatDateShort,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { EntryForm } from "@/components/entries/entry-form";
import { LatestNavInput } from "@/components/dashboard/latest-nav-input";

interface SummaryCardsProps {
  summary: DashboardSummary;
  portfolioChart?: PortfolioChartPoint[];
  navHistory?: ChartDataPoint[];
  funds?: FundConfig[];
  selectedFundId?: string;
  activeFund?: FundConfig;
  isLoading?: boolean;
}

/** Helper to shorten long fund names for small mobile pills (e.g. NMB Saral Bachat Fund-E -> NMB Saral) */
function formatFundShortName(name: string): string {
  if (!name) return "";
  if (name.toLowerCase().includes("nmb saral")) return "NMB Saral";
  const words = name.split(" ");
  if (words.length >= 2 && name.length > 12) {
    return `${words[0]} ${words[1]}`;
  }
  return name;
}

/**
 * Mobile Chart matching the user's reference image exactly:
 * Includes Y-axis labels on the left, horizontal grid lines, vertical drop lines,
 * hollow circular nodes, floating tooltip, and X-axis dates.
 */
function HeroRealGraph({
  points,
  summary,
}: {
  points?: PortfolioChartPoint[];
  summary: DashboardSummary;
}) {
  let rawValues: Array<{ val: number; date: string }> = [];
  if (points && points.length > 0) {
    rawValues = points.map((p) => ({
      val: p.portfolioValue,
      date: p.date ? new Date(p.date).toLocaleDateString("en-US", { weekday: "short" }) : "",
    }));
    if (rawValues[0].val > 0) {
      rawValues.unshift({ val: 0, date: "Start" });
    }
  } else {
    const invested = summary.totalInvested || 1000;
    const current = summary.currentValue ?? invested * 1.15;
    rawValues = [
      { val: 50, date: "Sat" },
      { val: 150, date: "Sun" },
      { val: 300, date: "Mon" },
      { val: 500, date: "Tue" },
      { val: 300, date: "Wed" },
      { val: 1000, date: "Thu" },
      { val: current, date: "Fri" },
    ];
  }

  const invested = summary.totalInvested || 1000;
  const values = rawValues.map((r) => r.val);
  const min = 0;
  const max = Math.max(...values, invested) * 1.15 || 4100;
  const range = max - min || 1;

  const width = 320;
  const height = 130;
  const padding = 12;

  const chartPoints = rawValues.map((p, i) => ({
    x: (i / (rawValues.length - 1)) * width,
    y: height - ((p.val - min) / range) * (height - 2 * padding) - padding,
    date: p.date,
    val: p.val,
  }));

  // Y-axis tick values matching the reference image layout
  const yTicks = [
    max,
    max * 0.75,
    max * 0.5,
    max * 0.25,
    min,
  ];

  const dPath =
    `M ${chartPoints[0].x},${chartPoints[0].y} ` +
    chartPoints.slice(1).map((c) => `L ${c.x},${c.y}`).join(" ");
  const fillPath = `${dPath} L ${width},${height} L 0,${height} Z`;

  const lastPt = chartPoints[chartPoints.length - 1];
  const midPt = chartPoints[Math.floor(chartPoints.length / 2)] || lastPt;

  return (
    <div className="w-full flex flex-col gap-2 mt-3">
      <div className="flex w-full items-stretch">
        {/* Y-Axis Labels Column (Left side as shown in screenshot) */}
        <div className="flex flex-col justify-between text-[10px] font-semibold text-muted-foreground pr-2 py-1 select-none shrink-0 w-11 text-right">
          {yTicks.map((tick, idx) => (
            <span key={idx}>
              {tick >= 1000 ? `$${(tick / 1000).toFixed(1)}k` : `$${Math.round(tick)}`}
            </span>
          ))}
        </div>

        {/* SVG Chart Container */}
        <div className="relative flex-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-40 overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Horizontal Grid Lines */}
            {yTicks.map((tick, idx) => {
              const y = height - ((tick - min) / range) * (height - 2 * padding) - padding;
              return (
                <line
                  key={idx}
                  x1="0"
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  className="text-border/50"
                />
              );
            })}

            {/* Vertical Drop Lines */}
            {chartPoints.map((pt, i) => (
              <line
                key={`v-${i}`}
                x1={pt.x}
                y1={pt.y}
                x2={pt.x}
                y2={height}
                stroke="currentColor"
                strokeWidth="1"
                className="text-blue-500/20"
              />
            ))}

            <defs>
              <linearGradient id="imageChartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area Fill */}
            <path d={fillPath} fill="url(#imageChartGrad)" />

            {/* Line */}
            <path
              d={dPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Point Nodes (Hollow circles matching reference image) */}
            {chartPoints.map((pt, i) => (
              <circle
                key={`c-${i}`}
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill="white"
                stroke="#3b82f6"
                strokeWidth="2"
              />
            ))}
          </svg>

          {/* Floating Tooltip Card (Matching the reference image middle popover) */}
          {midPt && (
            <div 
              className="absolute -top-1 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur border border-border shadow-md rounded-xl px-3 py-1.5 text-[11px] flex flex-col gap-0.5 z-20"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="font-semibold text-muted-foreground">Value</span>
                </div>
                <span className="font-bold text-foreground">
                  {formatCurrencyWhole(summary.currentValue ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="font-semibold text-muted-foreground">Invested</span>
                </div>
                <span className="font-bold text-foreground">
                  {formatCurrencyWhole(summary.totalInvested)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* X-Axis Dates */}
      <div className="flex justify-between items-center text-[11px] font-semibold text-muted-foreground pl-11 pr-1">
        {chartPoints.map((pt, idx) => (
          <span key={idx}>{pt.date}</span>
        ))}
      </div>
    </div>
  );
}

export function SummaryCards({
  summary,
  portfolioChart,
  navHistory = [],
  funds = [],
  selectedFundId = "all",
  activeFund,
  isLoading,
}: SummaryCardsProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <>
        {/* Mobile Skeleton */}
        <div className="flex lg:hidden flex-col gap-4 -mx-4 sm:-mx-6 lg:mx-0 -mt-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        {/* Desktop Skeleton */}
        <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  const isPositive = (summary.gainLoss ?? 0) >= 0;

  const currentValueDisplay =
    summary.currentValue !== null
      ? formatCurrencyWhole(summary.currentValue)
      : "Set NAV →";

  // Desktop Cards (Original 6-Grid)
  const cards = [
    {
      label: "Total Invested",
      value: formatCurrencyWhole(summary.totalInvested),
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Current Value",
      value: currentValueDisplay,
      icon: BarChart3,
      color:
        summary.currentValue !== null
          ? isPositive
            ? "text-positive"
            : "text-negative"
          : "text-muted-foreground",
      bgColor:
        summary.currentValue !== null
          ? isPositive
            ? "bg-emerald-500/10"
            : "bg-rose-500/10"
          : "bg-muted",
    },
    {
      label: "Total Gain/Loss",
      value:
        summary.gainLoss !== null
          ? `${formatCurrencyWhole(summary.gainLoss, true)} (${formatPercentage(summary.gainLossPct!)})`
          : "—",
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? "text-positive" : "text-negative",
      bgColor: isPositive ? "bg-emerald-500/10" : "bg-rose-500/10",
    },
    {
      label: "XIRR (Annualized Return)",
      value:
        summary.xirr !== null
          ? formatPercentage(summary.xirr * 100)
          : "Not enough data",
      icon: TrendingUp,
      color: summary.xirr !== null ? "text-primary" : "text-muted-foreground",
      bgColor: summary.xirr !== null ? "bg-primary/10" : "bg-muted",
      subtitle: summary.xirr === null ? "Need ≥ 3 entries" : undefined,
    },
    {
      label: "Total Units",
      value: formatUnits(summary.totalUnits),
      icon: Coins,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "SIP Streak",
      value: formatStreak(summary.sipStreak),
      icon: Flame,
      color:
        summary.sipStreak >= 3
          ? "text-amber-500"
          : "text-muted-foreground",
      bgColor:
        summary.sipStreak >= 3
          ? "bg-amber-500/10"
          : "bg-muted",
    },
  ];

  // Mobile Secondary Cards
  const mobileCards = [
    {
      label: "Annualized Return (XIRR)",
      value: summary.xirr !== null ? formatPercentage(summary.xirr * 100) : "Not enough data",
      subtitle: summary.xirr === null ? "Need ≥ 3 entries" : "Your true portfolio return rate",
      icon: TrendingUp,
      color: summary.xirr !== null ? "text-purple-500 dark:text-purple-400" : "text-muted-foreground",
      bgColor: summary.xirr !== null ? "bg-purple-500/10 dark:bg-purple-500/20" : "bg-muted",
    },
    {
      label: "Total Units",
      value: formatUnits(summary.totalUnits),
      subtitle: "Accumulated mutual fund units",
      icon: Coins,
      color: "text-amber-500 dark:text-amber-400",
      bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
    },
    {
      label: "SIP Streak",
      value: formatStreak(summary.sipStreak),
      subtitle: "Consecutive monthly investments",
      icon: Flame,
      color: summary.sipStreak >= 3 ? "text-orange-500" : "text-muted-foreground",
      bgColor: summary.sipStreak >= 3 ? "bg-orange-500/10" : "bg-muted",
    },
    {
      label: "Average Unit Cost",
      value: summary.totalUnits > 0 ? `NPR ${(summary.totalInvested / summary.totalUnits).toFixed(2)}` : "—",
      subtitle: "Weighted average purchase price",
      icon: BarChart3,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <>
      {/* MOBILE REDESIGNED VIEW MATCHING REFERENCE IMAGE 100% */}
      <div className="flex lg:hidden flex-col gap-3 -mx-4 sm:-mx-6 -mt-9 px-4 pt-0">
        
        {/* Top Balance & Graph Card (Exact design from screenshot) */}
        <div className="bg-card rounded-[2rem] p-5 border border-border/60 shadow-sm flex flex-col gap-4">
          
          {/* Header Row: Wallet Icon + Total Balance + Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground block leading-none mb-1">
                  Available Balance
                </span>
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                  {formatCurrencyWhole(summary.unallottedCash)}
                </h2>
              </div>
            </div>

            {/* Selector Dropdown / Add SIP Button */}
            <div className="flex items-center gap-2">
              {funds.length > 0 && (
                <Select
                  value={selectedFundId}
                  onValueChange={(val) =>
                    router.push(val === "all" ? "/dashboard?fund=all" : `/dashboard?fund=${val}`)
                  }
                >
                  <SelectTrigger className="bg-secondary/60 text-foreground border-border/50 h-9 text-xs font-bold rounded-full px-3 w-auto min-w-[90px] focus:ring-0">
                    <SelectValue>
                      {selectedFundId === "all"
                        ? "All Funds"
                        : formatFundShortName(
                            funds.find((f) => f.id === selectedFundId)?.fund_name || "All Funds"
                          )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funds</SelectItem>
                    {funds.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {formatFundShortName(f.fund_name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {funds.length > 0 && (
                <EntryForm
                  funds={funds}
                  defaultFundId={activeFund?.id}
                  trigger={
                    <Button
                      size="sm"
                      className="h-9 w-9 p-0 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md border-0 shrink-0 flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4 stroke-[3]" />
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          {/* Graph Section with Y-Axis and Tooltip */}
          <HeroRealGraph points={portfolioChart} summary={summary} />

          {/* Bottom Two Stat Pills (Total Income / Total Spent equivalent) */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40 mt-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block">Invested</span>
                <span className="text-sm font-extrabold text-foreground">
                  {formatCurrencyWhole(summary.totalInvested)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <ArrowDownRight className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block">Gain / Loss</span>
                <span className="text-sm font-extrabold text-foreground">
                  {summary.gainLoss !== null ? formatCurrencyWhole(summary.gainLoss, true) : "NPR 0"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Card (Compact Personal Box connected to Detailed Summary Dialog) */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="bg-card rounded-2xl p-3.5 border border-border/60 shadow-sm flex items-center justify-between cursor-pointer hover:border-border transition-all active:scale-[0.99] group">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-xs">Personal Summary</span>
                  <div
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full",
                      isPositive
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-rose-500/10 text-rose-500"
                    )}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    <span className="text-[10px] font-bold">
                      {summary.gainLossPct !== null
                        ? `${formatPercentage(summary.gainLossPct)} return`
                        : "0% return"}
                    </span>
                  </div>
                </div>

                <h3
                  className={cn(
                    "text-xl font-extrabold tracking-tight",
                    summary.gainLoss !== null
                      ? isPositive
                        ? "text-emerald-500"
                        : "text-rose-500"
                      : "text-foreground"
                  )}
                >
                  {summary.gainLoss !== null ? formatCurrencyWhole(summary.gainLoss, true) : "NPR 0"}
                </h3>
              </div>

              <div className="h-9 w-9 rounded-full bg-secondary/80 border border-border/50 text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all flex items-center justify-center shrink-0 shadow-sm">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </DialogTrigger>

          <DialogContent className="max-w-sm w-[92vw] rounded-3xl p-5">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-lg font-extrabold flex items-center justify-between">
                <span>Portfolio Summary</span>
                <span className="text-xs font-semibold text-blue-500 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                  {formatStreak(summary.sipStreak)} STREAK
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              {/* Highlight Hero Card */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-medium text-blue-100 uppercase tracking-wider block">Total Portfolio Value</span>
                    <h2 className="text-2xl font-extrabold tracking-tight mt-0.5">
                      {currentValueDisplay}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-medium text-blue-100 uppercase tracking-wider block">Gain / Loss</span>
                    <span className="font-extrabold text-sm text-white">
                      {summary.gainLoss !== null ? formatCurrencyWhole(summary.gainLoss, true) : "NPR 0"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/20 text-xs">
                  <span className="text-blue-100 text-[11px]">Total Invested: <strong className="text-white">{formatCurrencyWhole(summary.totalInvested)}</strong></span>
                  <span className="text-blue-100 text-[11px]">Return: <strong className="text-white">{summary.gainLossPct !== null ? formatPercentage(summary.gainLossPct) : "0%"}</strong></span>
                </div>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-secondary/40 rounded-xl p-2.5 flex flex-col gap-0.5 border border-border/40">
                  <span className="text-[10px] text-muted-foreground font-semibold">Latest NAV</span>
                  <span className="text-sm font-extrabold text-foreground">
                    {activeFund?.latest_nav ? `NPR ${Number(activeFund.latest_nav).toFixed(2)}` : "NPR 10.08"}
                  </span>
                </div>

                <div className="bg-secondary/40 rounded-xl p-2.5 flex flex-col gap-0.5 border border-border/40">
                  <span className="text-[10px] text-muted-foreground font-semibold">Total Units</span>
                  <span className="text-sm font-extrabold text-foreground">{formatUnits(summary.totalUnits)}</span>
                </div>

                <div className="bg-secondary/40 rounded-xl p-2.5 flex flex-col gap-0.5 border border-border/40">
                  <span className="text-[10px] text-muted-foreground font-semibold">Avg Unit Cost</span>
                  <span className="text-sm font-extrabold text-foreground">
                    {summary.totalUnits > 0
                      ? `NPR ${(summary.totalInvested / summary.totalUnits).toFixed(2)}`
                      : "—"}
                  </span>
                </div>

                <div className="bg-secondary/40 rounded-xl p-2.5 flex flex-col gap-0.5 border border-border/40">
                  <span className="text-[10px] text-muted-foreground font-semibold">Rollover Cash</span>
                  <span className="text-sm font-extrabold text-emerald-500">
                    {formatCurrencyWhole(summary.unallottedCash)}
                  </span>
                </div>
              </div>

              {/* Fee & Charges Breakdown Table */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Charges & Tax Breakdown
                </span>

                <div className="border border-border/60 rounded-xl overflow-hidden text-xs bg-card">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-secondary/50 border-b border-border/50 text-[10px] text-muted-foreground font-bold">
                        <th className="py-1.5 px-2.5">Charge Type</th>
                        <th className="py-1.5 px-2.5 text-center">Rate</th>
                        <th className="py-1.5 px-2.5 text-right">Est. Deduction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-[11px]">
                      <tr>
                        <td className="py-1.5 px-2.5 font-medium text-foreground">Entry Load</td>
                        <td className="py-1.5 px-2.5 text-center font-bold text-emerald-500">0%</td>
                        <td className="py-1.5 px-2.5 text-right font-medium text-muted-foreground">Free</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 font-medium text-foreground">Mgmt Fee</td>
                        <td className="py-1.5 px-2.5 text-center font-medium text-foreground">~1.5% p.a.</td>
                        <td className="py-1.5 px-2.5 text-right font-medium text-muted-foreground">In NAV</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 font-medium text-foreground">CGT (&gt; 1 Yr)</td>
                        <td className="py-1.5 px-2.5 text-center font-bold text-emerald-500">7.5%</td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-foreground">
                          {formatCurrencyWhole(summary.estimatedCgtLongTerm ?? 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 font-medium text-foreground">CGT (&lt; 1 Yr)</td>
                        <td className="py-1.5 px-2.5 text-center font-bold text-rose-500">10.0%</td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-foreground">
                          {formatCurrencyWhole(summary.estimatedCgtShortTerm ?? 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-1">
              <DialogClose asChild>
                <Button size="sm" className="w-full rounded-xl font-bold h-9">Close Summary</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Inline NAV Bar for Active Fund on Mobile */}
        {selectedFundId !== "all" && activeFund && (
          <div className="bg-card rounded-2xl px-4 py-2.5 shadow-sm border border-border/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Fund NAV:</span>
            <LatestNavInput
              fundId={activeFund.id}
              currentNav={activeFund.latest_nav ? Number(activeFund.latest_nav) : null}
              currentNavDate={activeFund.latest_nav_date}
            />
          </div>
        )}

        {/* Remaining Stats List (Positioned Above NAV History Card) */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
            STATISTICS
          </h3>
          {mobileCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-card rounded-2xl p-4 border border-border/50 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", card.bgColor)}>
                    <Icon className={cn("h-5 w-5", card.color)} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{card.label}</h4>
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  </div>
                </div>
                <span className="font-extrabold text-foreground text-sm">{card.value}</span>
              </div>
            );
          })}
        </div>

        {/* NAV History & Price Monitor Card */}
        {navHistory && navHistory.length > 0 && (
          <div className="bg-card rounded-[2rem] p-4 border border-border/60 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  NAV Monitor & History
                </h4>
                <span className="text-[11px] text-muted-foreground">Track historical fund NAV fluctuations</span>
              </div>
              <span className="text-xs font-extrabold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full">
                {activeFund?.latest_nav ? `NPR ${Number(activeFund.latest_nav).toFixed(2)}` : "10.08"}
              </span>
            </div>

            <div className="h-40 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={navHistory} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={formatDateShort} axisLine={false} />
                  <YAxis domain={["dataMin - 0.2", "dataMax + 0.2"]} tick={{ fontSize: 10 }} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "11px" }}
                    formatter={(val: any) => [`NPR ${Number(val).toFixed(2)}`, "NAV"]}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP VIEW (Original 6-Card Grid) */}
      <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="border-border/50 card-hover"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={cn(
                      "flex items-center justify-center h-9 w-9 rounded-lg",
                      card.bgColor
                    )}
                  >
                    <Icon className={cn("h-4 w-4", card.color)} />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">
                    {card.label}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-xl font-bold tabular-nums tracking-tight",
                    card.color
                  )}
                >
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
