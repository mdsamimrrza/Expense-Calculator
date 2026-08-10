"use client";

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Coins,
  Flame,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardSummary } from "@/lib/types";
import {
  formatCurrencyWhole,
  formatPercentage,
  formatUnits,
  formatStreak,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  summary: DashboardSummary;
  isLoading?: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isPositive = (summary.gainLoss ?? 0) >= 0;

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
      value:
        summary.currentValue !== null
          ? formatCurrencyWhole(summary.currentValue)
          : "Set NAV →",
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
      subtitle:
        summary.xirr === null ? "Need ≥ 3 entries" : undefined,
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
  );
}
