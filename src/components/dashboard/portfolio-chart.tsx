"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioChartPoint, DashboardSummary } from "@/lib/types";
import {
  formatCurrencyWhole,
  formatPercentage,
  formatDateShort,
  formatNav,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface PortfolioChartProps {
  data: PortfolioChartPoint[];
  summary?: DashboardSummary;
}

type TimeRange = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";

const TIME_RANGES: TimeRange[] = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"];

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const portfolioVal = Number(payload[0]?.value || 0);
    const investedVal = Number(payload[1]?.value || portfolioVal);
    const diff = portfolioVal - investedVal;

    return (
      <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs font-semibold space-y-1.5 min-w-[160px]">
        <span className="text-[11px] text-slate-400 block border-b border-slate-800 pb-1">
          {formatDateShort(String(label || ""))}
        </span>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
            Portfolio:
          </span>
          <span className="font-extrabold text-blue-400">
            {formatCurrencyWhole(portfolioVal)}
          </span>
        </div>
        {payload[1] && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
              Invested:
            </span>
            <span className="font-extrabold text-slate-300">
              {formatCurrencyWhole(investedVal)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[11px]">
          <span className="text-slate-400">Return:</span>
          <span
            className={cn(
              "font-bold",
              diff >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {diff >= 0 ? "+" : ""}
            {formatCurrencyWhole(diff)}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export function PortfolioChart({ data, summary }: PortfolioChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("ALL");

  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    if (data.length <= 1 || timeRange === "ALL") return data;

    const lastPoint = data[data.length - 1];
    const lastDate = new Date(lastPoint.date).getTime();

    let cutoffMs = 0;
    if (timeRange === "1M") cutoffMs = 30 * 24 * 60 * 60 * 1000;
    else if (timeRange === "3M") cutoffMs = 90 * 24 * 60 * 60 * 1000;
    else if (timeRange === "6M") cutoffMs = 180 * 24 * 60 * 60 * 1000;
    else if (timeRange === "1Y") cutoffMs = 365 * 24 * 60 * 60 * 1000;
    else if (timeRange === "3Y") cutoffMs = 3 * 365 * 24 * 60 * 60 * 1000;
    else if (timeRange === "5Y") cutoffMs = 5 * 365 * 24 * 60 * 60 * 1000;

    const filtered = data.filter((d) => {
      const ptDate = new Date(d.date).getTime();
      return lastDate - ptDate <= cutoffMs;
    });

    return filtered.length >= 2 ? filtered : data.slice(-2);
  }, [data, timeRange]);

  // Derived values for metrics header
  const latestPoint = data.length > 0 ? data[data.length - 1] : null;
  const currVal = summary?.currentValue ?? latestPoint?.portfolioValue ?? 0;
  const totalInv = summary?.totalInvested ?? latestPoint?.totalInvested ?? 0;
  const gainVal = summary?.gainLoss ?? (currVal ? currVal - totalInv : 0);
  const gainPct =
    summary?.gainLossPct ?? (totalInv > 0 ? (gainVal / totalInv) * 100 : 0);
  const isPositive = gainVal >= 0;

  const maxVal = Math.max(
    ...filteredData.flatMap((d) => [d.portfolioValue, d.totalInvested]),
    0
  );
  const topTick = Math.max(Math.ceil((maxVal * 1.2) / 2000) * 2000, 4000);
  const step = topTick / 3;
  const ticks = [0, step, step * 2, topTick];

  if (data.length === 0) {
    return (
      <Card className="border-border/60 rounded-[2rem] shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base font-extrabold tracking-tight">
            Portfolio Growth
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[260px] text-muted-foreground text-xs">
          Add entries to see your portfolio growth
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 rounded-[2rem] shadow-sm overflow-hidden bg-card">
      <CardHeader className="pb-3 space-y-3">
        {/* Top Header: Value + Up/Down Indicator & Time Range Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Portfolio Growth
              </span>
              {summary?.latestNav && (
                <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full font-medium">
                  NAV: NPR {formatNav(summary.latestNav)}
                  {summary.latestNavDate ? ` (${formatDateShort(summary.latestNavDate)})` : ""}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {formatCurrencyWhole(currVal)}
              </h2>

              {/* Up/Down Gain Indicator Badge */}
              <div
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold shadow-xs",
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                )}
              >
                {isPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {formatCurrencyWhole(gainVal)} ({formatPercentage(gainPct)})
                </span>
              </div>
            </div>
          </div>

          {/* Time Range Selector Tabs (1D, 1W, 1M, 1Y, ALL) */}
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-full border border-border/40 shrink-0 self-start sm:self-center">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-full transition-all duration-150 select-none",
                  timeRange === range
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-Legend */}
        <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground pt-1 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span>Portfolio Value (Updated NAV)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 border-t-2 border-dashed border-slate-400" />
            <span>Total Invested</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="h-[260px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.25}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tick={{ fontSize: 10, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                domain={[0, topTick]}
                ticks={ticks}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="portfolioValue"
                name="Portfolio Value"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={filteredData.length > 15 ? false : { r: 3.5, fill: "#3b82f6", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0, fill: "#3b82f6" }}
              />
              <Line
                type="monotone"
                dataKey="totalInvested"
                name="Total Invested"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "#94a3b8" }}
              />

            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

