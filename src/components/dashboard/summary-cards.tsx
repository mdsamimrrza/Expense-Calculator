"use client";

import { useState, useMemo } from "react";
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
  formatNav,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { EntryForm } from "@/components/entries/entry-form";

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

type TimeRange = "1D" | "1W" | "1M" | "1Y" | "ALL";
const TIME_RANGES: TimeRange[] = ["1D", "1W", "1M", "1Y", "ALL"];

/**
 * Mobile Chart matching the user's reference image exactly:
 * Includes Y-axis labels on the left, horizontal grid lines, vertical drop lines,
 * hollow circular nodes, floating tooltip, X-axis dates, and timeframe tabs (1D, 1W, 1M, 1Y, ALL).
 */
function HeroRealGraph({
  points,
  summary,
}: {
  points?: PortfolioChartPoint[];
  summary: DashboardSummary;
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("ALL");

  const activePoints = useMemo(() => {
    if (!points || points.length <= 1 || timeRange === "ALL") return points;

    const lastPoint = points[points.length - 1];
    const lastDate = new Date(lastPoint.date).getTime();

    if (timeRange === "1D") return points.slice(-2);

    let cutoffMs = 0;
    if (timeRange === "1W") cutoffMs = 7 * 24 * 60 * 60 * 1000;
    else if (timeRange === "1M") cutoffMs = 30 * 24 * 60 * 60 * 1000;
    else if (timeRange === "1Y") cutoffMs = 365 * 24 * 60 * 60 * 1000;

    const filtered = points.filter((d) => {
      const ptDate = new Date(d.date).getTime();
      return lastDate - ptDate <= cutoffMs;
    });

    return filtered.length >= 2 ? filtered : points.slice(-2);
  }, [points, timeRange]);

  let rawValues: Array<{ val: number; date: string }> = [];
  if (activePoints && activePoints.length > 0) {
    rawValues = activePoints.map((p) => ({
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

  const midPt = chartPoints[Math.floor(chartPoints.length / 2)] || chartPoints[chartPoints.length - 1];

  return (
    <div className="w-full flex flex-col gap-2 mt-2">
      {/* Time Range Tabs Bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Performance Trend</span>
        <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-full border border-border/30">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded-full transition-all select-none",
                timeRange === r
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-full items-stretch">
        {/* Y-Axis Labels Column */}
        <div className="flex flex-col justify-between text-[10px] font-semibold text-muted-foreground pr-2 py-1 select-none shrink-0 w-11 text-right">
          {yTicks.map((tick, idx) => (
            <span key={idx}>
              {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : Math.round(tick)}
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

            {/* Data Point Nodes */}
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

          {/* Floating Tooltip Card */}
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
      {/* UNIFIED HERO & STATISTICS VIEW ACROSS ALL DEVICES */}
      <div className="flex flex-col gap-4 w-full">
        
        {/* Top Balance & Graph Card */}
        <div className="bg-card rounded-[2rem] p-5 sm:p-6 border border-border/60 shadow-sm flex flex-col gap-4 w-full overflow-hidden">
          
          {/* Header Row: Wallet Icon + Total Portfolio Value + Gain Indicator + Selector */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground block leading-none mb-1">
                    Current Portfolio Value
                  </span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                      {summary.currentValue !== null
                        ? formatCurrencyWhole(summary.currentValue)
                        : formatCurrencyWhole(summary.totalInvested)}
                    </h2>
                    
                    {/* Up/Down Gain Indicator Badge */}
                    {summary.gainLoss !== null && (
                      <div
                        className={cn(
                          "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-extrabold",
                          (summary.gainLoss ?? 0) >= 0
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-rose-500/10 text-rose-500"
                        )}
                      >
                        {(summary.gainLoss ?? 0) >= 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {(summary.gainLoss ?? 0) >= 0 ? "+" : ""}
                          {formatCurrencyWhole(summary.gainLoss, true)} ({formatPercentage(summary.gainLossPct ?? 0)})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selector Dropdown & Add SIP Button */}
              <div className="flex items-center gap-2">
                {funds.length > 0 && (
                  <Select
                    value={selectedFundId}
                    onValueChange={(val) =>
                      router.push(val === "all" ? "/dashboard?fund=all" : `/dashboard?fund=${val}`)
                    }
                  >
                    <SelectTrigger className="bg-secondary/60 text-foreground border-border/50 h-9 text-xs font-bold rounded-full px-3.5 w-auto min-w-[100px] focus:ring-0">
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

            {/* Sub-bar: Rollover Wallet / Unallotted Cash + Latest NAV Info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
              <span className="flex items-center gap-1.5 font-medium">
                <Coins className="h-3.5 w-3.5 text-blue-500" />
                Unallotted Cash: <strong className="text-foreground">{formatCurrencyWhole(summary.unallottedCash)}</strong>
              </span>
              {summary.latestNav && (
                <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  NAV: NPR {formatNav(summary.latestNav)}
                </span>
              )}
            </div>
          </div>

          {/* Graph Section with Y-Axis and Tooltip */}
          <HeroRealGraph points={portfolioChart} summary={summary} />

          {/* Bottom Two Stat Pills */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40 mt-1">
            <div className="flex items-center gap-3 bg-secondary/30 p-2.5 rounded-2xl border border-border/30">
              <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground block truncate">Invested</span>
                <span className="text-sm font-extrabold text-foreground truncate block">
                  {formatCurrencyWhole(summary.totalInvested)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-secondary/30 p-2.5 rounded-2xl border border-border/30">
              <div
                className={cn(
                  "h-9 w-9 rounded-full text-white flex items-center justify-center shrink-0 shadow-sm",
                  isPositive ? "bg-emerald-500" : "bg-rose-500"
                )}
              >
                {isPositive ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground block truncate">Gain / Loss</span>
                <span
                  className={cn(
                    "text-sm font-extrabold truncate block",
                    summary.gainLoss !== null
                      ? isPositive
                        ? "text-emerald-500"
                        : "text-rose-500"
                      : "text-foreground"
                  )}
                >
                  {summary.gainLoss !== null ? formatCurrencyWhole(summary.gainLoss, true) : "NPR 0"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Summary Banner */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-sm flex items-center justify-between cursor-pointer hover:border-border transition-all active:scale-[0.99] group">
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
                  <span className="text-[10px] text-muted-foreground font-semibold">SIP Streak</span>
                  <span className="text-sm font-extrabold text-amber-500">
                    {formatStreak(summary.sipStreak)}
                  </span>
                </div>
              </div>

              {/* Capital Allocation & Reconciliation Breakdown Table */}
              <div className="bg-secondary/20 rounded-2xl p-3.5 border border-border/40 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-blue-500" />
                    Capital Reconciliation
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Fund Breakdown
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Total Cash Deposited</span>
                    <strong className="text-foreground font-mono">{formatCurrencyWhole(summary.totalInvested)}</strong>
                  </div>

                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>(-) Rollover Wallet Change</span>
                    <strong className="text-blue-500 font-mono">-{formatCurrencyWhole(summary.unallottedCash)}</strong>
                  </div>

                  <div className="flex justify-between items-center font-semibold pt-1 border-t border-border/20 text-foreground">
                    <span>Effective Deployed Capital</span>
                    <span className="font-mono text-emerald-500">{formatCurrencyWhole(Math.max(0, summary.totalInvested - summary.unallottedCash))}</span>
                  </div>

                  <div className="flex justify-between items-center text-muted-foreground pt-1">
                    <span>Current Units Value (@ NAV)</span>
                    <strong className="text-foreground font-mono">{formatCurrencyWhole(summary.currentValue ?? 0)}</strong>
                  </div>

                  <div className="flex justify-between items-center font-bold pt-1 border-t border-border/30 text-foreground">
                    <span>Net Investment Return</span>
                    <span className={cn("font-mono", (summary.gainLoss ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {summary.gainLoss !== null ? formatCurrencyWhole(summary.gainLoss, true) : "NPR 0"}
                      <span className="text-[10px] ml-1">({summary.gainLossPct !== null ? formatPercentage(summary.gainLossPct) : "0%"})</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Tax Estimation */}
              <div className="bg-secondary/20 rounded-xl p-3 border border-border/40 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-border/30 pb-1.5">
                  <span className="font-bold text-foreground">Capital Gains Tax (CGT)</span>
                  <span className="text-[10px] text-muted-foreground">Estimated Tax</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                    <span>Long-Term (&gt; 1 yr @ 7.5%)</span>
                    <span className="font-bold text-foreground">
                      {formatCurrencyWhole(summary.estimatedCgtLongTerm ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                    <span>Short-Term (&lt; 1 yr @ 10.0%)</span>
                    <span className="font-bold text-foreground">
                      {formatCurrencyWhole(summary.estimatedCgtShortTerm ?? 0)}
                    </span>
                  </div>
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

        {/* STATISTICS Grid (Responsive across Mobile, Tablet, Laptop & Desktop) */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
            STATISTICS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
            {mobileCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-card rounded-2xl p-4 border border-border/50 flex items-center justify-between shadow-sm hover:border-border transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", card.bgColor)}>
                      <Icon className={cn("h-5 w-5", card.color)} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-foreground text-sm truncate">{card.label}</h4>
                      <p className="text-xs text-muted-foreground truncate">{card.subtitle}</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-foreground text-sm shrink-0 ml-2">{card.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
