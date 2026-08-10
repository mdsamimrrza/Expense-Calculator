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
import type { DashboardSummary, PortfolioChartPoint, FundConfig } from "@/lib/types";
import {
  formatCurrencyWhole,
  formatPercentage,
  formatUnits,
  formatStreak,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { EntryForm } from "@/components/entries/entry-form";
import { LatestNavInput } from "@/components/dashboard/latest-nav-input";

interface SummaryCardsProps {
  summary: DashboardSummary;
  portfolioChart?: PortfolioChartPoint[];
  funds?: FundConfig[];
  selectedFundId?: string;
  activeFund?: FundConfig;
  isLoading?: boolean;
}

/**
 * Real Dynamic SVG Graph for Mobile Hero Card
 * Maps the actual user investment points and dates — NO fake static curves or numbers!
 */
function HeroRealGraph({
  points,
  summary,
}: {
  points?: PortfolioChartPoint[];
  summary: DashboardSummary;
}) {
  const isPositive = (summary.gainLoss ?? 0) >= 0;
  const strokeColor = isPositive ? "#10B981" : "#F43F5E";
  const goldColor = "#F59E0B";

  let chartPoints: Array<{ x: number; y: number; date: string; val: number }> = [];
  let dateLabels: string[] = [];

  const width = 400;
  const height = 65;
  const padding = 12;

  if (points && points.length >= 2) {
    const values = points.map((p) => p.portfolioValue);
    const min = Math.min(...values);
    const max = Math.max(...values) || 1;
    const range = max - min || 1;

    chartPoints = points.map((p, i) => ({
      x: (i / (points.length - 1)) * width,
      y: height - ((p.portfolioValue - min) / range) * (height - 2 * padding) - padding,
      date: p.date,
      val: p.portfolioValue,
    }));

    dateLabels = [
      points[0]?.date ? new Date(points[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Start",
      points[Math.floor(points.length / 2)]?.date ? new Date(points[Math.floor(points.length / 2)].date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
      points[points.length - 1]?.date ? new Date(points[points.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today",
    ].filter(Boolean);
  } else {
    // Single entry or starting out: plot real entry trajectory (0 -> invested -> current)
    const invested = summary.totalInvested || 1;
    const current = summary.currentValue ?? invested;

    const min = 0;
    const max = Math.max(invested, current) * 1.15;
    const range = max - min || 1;

    const y0 = height - ((0 - min) / range) * (height - 2 * padding) - padding;
    const y1 = height - ((invested - min) / range) * (height - 2 * padding) - padding;
    const y2 = height - ((current - min) / range) * (height - 2 * padding) - padding;

    chartPoints = [
      { x: 0, y: y0, date: "Start", val: 0 },
      { x: width * 0.45, y: y1, date: "Purchased", val: invested },
      { x: width, y: y2, date: "Today", val: current },
    ];

    dateLabels = ["Start", "Purchase", "Today"];
  }

  const dPath =
    `M ${chartPoints[0].x},${chartPoints[0].y} ` +
    chartPoints.slice(1).map((c) => `L ${c.x},${c.y}`).join(" ");
  const fillPath = `${dPath} L ${width},${height + 20} L 0,${height + 20} Z`;
  const lastPt = chartPoints[chartPoints.length - 1];

  return (
    <div className="w-full mt-3 mb-1 relative">
      <svg
        viewBox={`0 0 ${width} ${height + 15}`}
        className="w-full h-20 overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="realHeroGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={goldColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={goldColor} stopOpacity="0.0" />
          </linearGradient>
          <filter id="realGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <path d={fillPath} fill="url(#realHeroGrad)" />
        <path
          d={dPath}
          fill="none"
          stroke={goldColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#realGlow)"
        />

        {/* Active Node Pulse at current value point */}
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="5"
          fill={goldColor}
          className="animate-pulse"
        />
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="9"
          fill={goldColor}
          fillOpacity="0.35"
        />
      </svg>

      {/* Real Date Markers */}
      <div className="flex justify-between items-center text-[10px] font-bold text-white/60 px-1 mt-1 uppercase tracking-widest">
        {dateLabels.map((lbl, idx) => (
          <span key={idx}>{lbl}</span>
        ))}
      </div>
    </div>
  );
}

export function SummaryCards({
  summary,
  portfolioChart,
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
          <Skeleton className="h-64 w-full rounded-b-[2.5rem] rounded-t-none" />
          <div className="px-4 flex flex-col gap-3 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
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

  // Mobile Secondary Cards (List style)
  const mobileCards = [
    {
      label: "Total Invested",
      value: formatCurrencyWhole(summary.totalInvested),
      subtitle: "Principal amount invested",
      icon: Wallet,
      color: "text-blue-500 dark:text-blue-400",
      bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
      progressBg: "bg-blue-500",
      progressWidth: "w-full",
    },
    {
      label: "Total Gain/Loss",
      value: summary.gainLoss !== null ? formatCurrencyWhole(summary.gainLoss, true) : "—",
      subtitle: summary.gainLossPct !== null ? `${isPositive ? "Up" : "Down"} by ${formatPercentage(summary.gainLossPct)}` : "—",
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400",
      bgColor: isPositive ? "bg-emerald-500/10 dark:bg-emerald-500/20" : "bg-rose-500/10 dark:bg-rose-500/20",
      progressBg: isPositive ? "bg-emerald-500" : "bg-rose-500",
      progressWidth: summary.gainLossPct !== null ? `${Math.min(Math.abs(summary.gainLossPct), 100)}%` : "0%",
    },
    {
      label: "Annualized Return",
      value: summary.xirr !== null ? formatPercentage(summary.xirr * 100) : "Not enough data",
      subtitle: summary.xirr === null ? "Need ≥ 3 entries" : "Your true portfolio return rate",
      icon: TrendingUp,
      color: summary.xirr !== null ? "text-purple-500 dark:text-purple-400" : "text-muted-foreground",
      bgColor: summary.xirr !== null ? "bg-purple-500/10 dark:bg-purple-500/20" : "bg-muted",
      progressBg: "bg-purple-500",
      progressWidth: summary.xirr !== null ? `${Math.min(Math.max(summary.xirr * 100, 0), 100)}%` : "0%",
    },
    {
      label: "Total Units",
      value: formatUnits(summary.totalUnits),
      subtitle: "Accumulated mutual fund units",
      icon: Coins,
      color: "text-amber-500 dark:text-amber-400",
      bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
      progressBg: "bg-amber-500",
      progressWidth: "w-3/4",
    },
  ];

  return (
    <>
      {/* MOBILE UNIFIED HERO & CATEGORIES */}
      <div className="flex lg:hidden flex-col gap-5 -mx-4 sm:-mx-6 -mt-6">
        {/* Executive Royal Navy & Gold Hero Card */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0D1527] border-b border-amber-500/20 pt-6 pb-6 px-5 rounded-b-[2.5rem] text-white relative overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
          
          {/* Top Actions Bar: Fund Switcher + Add SIP Button */}
          <div className="flex justify-between items-center relative z-10 mb-6 gap-2">
            {/* Fund Selector Dropdown */}
            {funds.length > 0 && (
              <Select
                value={selectedFundId}
                onValueChange={(val) =>
                  router.push(val === "all" ? "/dashboard?fund=all" : `/dashboard?fund=${val}`)
                }
              >
                <SelectTrigger className="bg-white/10 backdrop-blur-md text-white border-white/20 h-8 text-xs font-bold rounded-full px-3 w-auto min-w-[130px] max-w-[190px] shadow-sm focus:ring-0 [&>span]:line-clamp-1 [&>span]:text-white">
                  <SelectValue placeholder={funds.find((f) => f.id === selectedFundId)?.fund_name || "All Funds"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Funds</SelectItem>
                  {funds.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.fund_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Quick Add SIP Button */}
            {funds.length > 0 && (
              <EntryForm
                funds={funds}
                defaultFundId={activeFund?.id}
                trigger={
                  <Button
                    size="sm"
                    className="h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 shadow-[0_0_15px_rgba(245,158,11,0.4)] border-0 gap-1 active:scale-95 transition-all shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    Add SIP
                  </Button>
                }
              />
            )}
          </div>

          {/* Centered Portfolio Value Display */}
          <div className="flex flex-col items-center justify-center relative z-10 text-center">
            <span className="text-amber-400/90 text-xs font-bold uppercase tracking-widest mb-1">
              Portfolio Value
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight drop-shadow-md text-white">
              {currentValueDisplay}
            </h1>

            {/* Net Gain/Loss Pill Badge */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                {isPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
                )}
                <span className={cn("text-xs font-bold", isPositive ? "text-emerald-400" : "text-rose-400")}>
                  {summary.gainLoss !== null ? formatCurrencyWhole(summary.gainLoss, true) : "NPR 0"}
                </span>
              </div>

              {/* Streak Badge */}
              <div className="flex items-center gap-1.5 bg-amber-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/30">
                <Flame className={cn("h-3.5 w-3.5", summary.sipStreak >= 3 ? "text-amber-400" : "text-white/70")} />
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  {formatStreak(summary.sipStreak)} STREAK
                </span>
              </div>
            </div>
          </div>

          {/* REAL Dynamic Graph mapped to actual investment data */}
          <div className="relative z-10">
            <HeroRealGraph points={portfolioChart} summary={summary} />
          </div>
        </div>

        {/* Inline NAV Bar for Active Fund on Mobile */}
        {selectedFundId !== "all" && activeFund && (
          <div className="px-4 -mt-2">
            <div className="bg-card rounded-2xl px-4 py-2.5 shadow-sm border border-border/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Fund NAV:</span>
              <LatestNavInput
                fundId={activeFund.id}
                currentNav={activeFund.latest_nav ? Number(activeFund.latest_nav) : null}
                currentNavDate={activeFund.latest_nav_date}
              />
            </div>
          </div>
        )}

        {/* Secondary Stats List */}
        <div className="px-4 flex flex-col gap-3.5 mb-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              CATEGORIES
            </h3>
            <span className="text-xs font-semibold text-amber-500">Overview</span>
          </div>

          {mobileCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-card rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-border/40 flex flex-col gap-3 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={cn(
                        "h-11 w-11 rounded-2xl flex items-center justify-center shadow-inner shrink-0",
                        card.bgColor
                      )}
                    >
                      <Icon className={cn("h-5 w-5", card.color)} />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm leading-tight">
                        {card.label}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                        {card.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-0.5 px-0.5">
                  <div className="h-2 w-32 bg-secondary/80 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500 opacity-90", card.progressBg)}
                      style={{ width: card.progressWidth }}
                    />
                  </div>
                  <span className="font-extrabold text-foreground text-sm tabular-nums tracking-tight">
                    {card.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
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
