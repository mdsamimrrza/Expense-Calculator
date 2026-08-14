"use client";

import { useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
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
import type { DashboardSummary, PortfolioChartPoint, ChartDataPoint, FundConfig } from "@/lib/types";
import {
  formatCurrencyWhole,
  formatPercentage,
  formatUnits,
  formatStreak,
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
  mobileChartSlot?: React.ReactNode;
  latestNavSlot?: React.ReactNode;
}

/** Helper to shorten long fund names for small pills (e.g. NMB Saral Bachat Fund-E -> NMB Saral) */
function formatFundShortName(name: string): string {
  if (!name) return "";
  const lowerName = name.toLowerCase();
  if (lowerName.includes("nibl sahabhagita") || lowerName.includes("nibl saha")) return "NIBLSF";
  if (lowerName.includes("nmb saral")) return "NMB Saral";
  const words = name.split(" ");
  if (words.length >= 2 && name.length > 12) {
    return `${words[0]} ${words[1]}`;
  }
  return name;
}

export function SummaryCards({
  summary,
  funds = [],
  selectedFundId = "all",
  activeFund,
  isLoading,
  mobileChartSlot,
  latestNavSlot,
}: SummaryCardsProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/50 rounded-2xl">
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isPositive = (summary.gainLoss ?? 0) >= 0;

  const currentValueDisplay =
    summary.currentValue !== null
      ? formatCurrencyWhole(summary.currentValue)
      : formatCurrencyWhole(summary.totalInvested);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 4 KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* CARD 1: Portfolio Value & Actions (Redesigned for Mobile & Compact on Laptop) */}
        <div className="bg-gradient-to-br from-card via-card/95 to-blue-950/20 sm:bg-card rounded-[2.25rem] sm:rounded-[2rem] p-4 sm:p-4 border border-blue-500/20 sm:border-border/60 shadow-lg shadow-blue-500/5 sm:shadow-sm flex flex-col justify-between gap-2 sm:gap-2.5 overflow-hidden relative group">
          <div className="flex items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 sm:h-8 sm:w-8 rounded-xl sm:rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 shrink-0">
                <Wallet className="h-4 w-4 sm:h-4 sm:w-4" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Portfolio Value
              </span>
            </div>

            {/* Fund Selector & Add SIP Button */}
            <div className="flex items-center gap-2 sm:gap-1.5 shrink-0 mr-2 sm:mr-0">
              {funds.length > 0 && (
                <Select
                  value={selectedFundId}
                  onValueChange={(val) =>
                    router.push(val === "all" ? "/dashboard?fund=all" : `/dashboard?fund=${val}`)
                  }
                >
                  <SelectTrigger className="bg-secondary/80 sm:bg-secondary/60 text-foreground border-border/60 h-9 sm:h-7.5 text-xs sm:text-[11px] font-extrabold rounded-full px-3.5 sm:px-2.5 w-auto min-w-[85px] focus:ring-0 shadow-sm">
                    <SelectValue>
                      {selectedFundId === "all"
                        ? "All Funds"
                        : formatFundShortName(
                          funds.find((f) => f.id === selectedFundId)?.fund_name || "All Funds"
                        )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
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
                      className="h-9 w-9 sm:h-8 sm:w-8 p-0 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30 border-0 shrink-0 flex items-center justify-center transition-transform active:scale-95"
                    >
                      <Plus className="h-5 w-5 sm:h-4 sm:w-4 stroke-[2.5]" />
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 z-10 pl-3.5 sm:pl-0">
            <h2 className="text-2xl sm:text-2xl lg:text-[1.65rem] font-extrabold text-foreground tracking-tight">
              {currentValueDisplay}
            </h2>
            {summary.gainLoss !== null && (
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[11px] sm:text-[11px] font-extrabold px-2.5 sm:px-2 py-0.5 rounded-full border shadow-sm",
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-3 w-3 sm:h-3 sm:w-3 stroke-[2.5]" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 sm:h-3 sm:w-3 stroke-[2.5]" />
                  )}
                  <span>
                    {isPositive ? "+" : ""}
                    {formatCurrencyWhole(summary.gainLoss, true)} ({formatPercentage(summary.gainLossPct ?? 0)})
                  </span>
                </span>
              </div>
            )}

            {/* In-Card NAV Slot */}
            {latestNavSlot && (
              <div className="mt-2.5 sm:mt-1.5 pt-2.5 sm:pt-1.5 border-t border-border/40 w-full">
                {latestNavSlot}
              </div>
            )}
          </div>
        </div>

        {mobileChartSlot}

        {/* CARD 2: Invested Amount & Net Gain/Loss */}
        <div className="bg-card rounded-[2rem] p-5 border border-border/60 shadow-sm flex flex-col justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Coins className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Invested & Return
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[11px] text-muted-foreground block font-medium">Invested</span>
              <span className="text-lg font-extrabold text-foreground tracking-tight">
                {formatCurrencyWhole(summary.totalInvested)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block font-medium">Net Gain / Loss</span>
              <span
                className={cn(
                  "text-lg font-extrabold tracking-tight",
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

        {/* CARD 3: Unallotted Cash & Current NAV */}
        <div className="bg-card rounded-[2rem] p-5 border border-border/60 shadow-sm flex flex-col justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <BarChart3 className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Cash & NAV
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[11px] text-muted-foreground block font-medium">Unallotted Cash</span>
              <span className="text-lg font-extrabold text-foreground tracking-tight">
                {formatCurrencyWhole(summary.unallottedCash)}
              </span>
            </div>
            {summary.latestNav && (
              <div className="text-right">
                <span className="text-[11px] text-muted-foreground block font-medium" title="Net Asset Value (Price per unit)">NAV (Net Asset Value)</span>
                <span className="text-lg font-extrabold text-emerald-500 tracking-tight">
                  NPR {formatNav(summary.latestNav)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: Annualized Return (XIRR) & SIP Streak */}
        <div className="bg-card rounded-[2rem] p-5 border border-border/60 shadow-sm flex flex-col justify-between gap-3 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Performance
              </span>
            </div>
            <div className="flex items-center gap-1 bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full text-[11px] font-extrabold">
              <Flame className="h-3 w-3" />
              <span>{formatStreak(summary.sipStreak)}</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[11px] text-muted-foreground block font-medium">
                XIRR Return <span className="text-[9px] text-muted-foreground/80 font-normal block sm:inline sm:ml-1">(Extended Internal Rate of Return)</span>
              </span>
              <span className="text-lg font-extrabold text-foreground tracking-tight">
                {summary.xirr !== null ? formatPercentage(summary.xirr * 100) : "—"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block font-medium">Total Units</span>
              <span className="text-lg font-extrabold text-foreground tracking-tight">
                {formatUnits(summary.totalUnits)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Summary Banner Card (Interactive Dialog Trigger) */}
      <Dialog>
        <DialogTrigger asChild>
          <div className="bg-card rounded-[2rem] p-5 border border-border/60 shadow-sm flex items-center justify-between gap-4 w-full cursor-pointer hover:border-border transition-all active:scale-[0.99] group">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={cn(
                  "h-11 w-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md",
                  isPositive ? "bg-emerald-500 shadow-emerald-500/20" : "bg-rose-500 shadow-rose-500/20"
                )}
              >
                {isPositive ? (
                  <ArrowUpRight className="h-5 w-5" />
                ) : (
                  <ArrowDownRight className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-foreground text-sm">Personal Summary</h3>
                  {summary.gainLossPct !== null && (
                    <span
                      className={cn(
                        "text-[10px] font-extrabold px-2 py-0.5 rounded-full",
                        isPositive
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-rose-500/10 text-rose-500"
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {formatPercentage(summary.gainLossPct)} return
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xl font-extrabold block tracking-tight mt-0.5 truncate",
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

            <div className="h-9 w-9 rounded-full bg-secondary/80 border border-border/50 text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all flex items-center justify-center shrink-0 shadow-sm">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </DialogTrigger>

        <DialogContent className="w-[95vw] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl rounded-3xl p-5 md:p-6 lg:p-7 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-lg font-extrabold flex items-center justify-between">
              <span>Portfolio Summary</span>
              <span className="text-xs font-semibold text-blue-500 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                {formatStreak(summary.sipStreak)} STREAK
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Comprehensive breakdown of your investments, capital allocation, and taxes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-1">
            {/* Highlight Hero Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-medium text-blue-100 uppercase tracking-wider block">
                    Total Portfolio Value
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight mt-0.5">
                    {currentValueDisplay}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-blue-100 uppercase tracking-wider block">
                    Gain / Loss
                  </span>
                  <span className="font-extrabold text-sm text-white">
                    {summary.gainLoss !== null ? formatCurrencyWhole(summary.gainLoss, true) : "NPR 0"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/20 text-xs">
                <span className="text-blue-100 text-[11px]">
                  Total Invested: <strong className="text-white">{formatCurrencyWhole(summary.totalInvested)}</strong>
                </span>
                <span className="text-blue-100 text-[11px]">
                  Return: <strong className="text-white">{summary.gainLossPct !== null ? formatPercentage(summary.gainLossPct) : "0%"}</strong>
                </span>
              </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-secondary/40 rounded-xl p-2.5 flex flex-col gap-0.5 border border-border/40">
                <span className="text-[10px] text-muted-foreground font-semibold">Latest NAV</span>
                <span className="text-sm font-extrabold text-foreground">
                  {activeFund?.latest_nav ? `NPR ${Number(activeFund.latest_nav).toFixed(2)}` : "—"}
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

            {/* Capital Allocation & Reconciliation Breakdown */}
            <div className="bg-secondary/20 rounded-2xl p-3.5 border border-border/40 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-blue-500" />
                  Capital Reconciliation
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Breakdown
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Total Cash Deposited</span>
                  <strong className="text-foreground font-mono">{formatCurrencyWhole(summary.totalInvested)}</strong>
                </div>

                <div className="flex justify-between items-center text-muted-foreground">
                  <span>(-) Rollover Wallet Cash</span>
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
                  <span className={cn("font-mono", isPositive ? "text-emerald-500" : "text-rose-500")}>
                    {summary.gainLoss !== null ? formatCurrencyWhole(summary.gainLoss, true) : "NPR 0"}
                    <span className="text-[10px] ml-1">({summary.gainLossPct !== null ? formatPercentage(summary.gainLossPct) : "0%"})</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Tax Estimation */}
            <div className="bg-secondary/20 rounded-xl p-3 border border-border/40 text-xs space-y-1.5">
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

            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-bold h-9 border-blue-500/30 text-blue-500 hover:bg-blue-500/10 flex items-center justify-center gap-2"
              onClick={() => router.push("/tax-breakdown")}
            >
              <span>View Full Tax & Settlement Ledger</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button size="sm" className="w-full rounded-xl font-bold h-9">
                Close Summary
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
