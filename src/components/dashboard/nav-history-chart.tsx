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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartDataPoint } from "@/lib/types";
import { formatNav, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

type TimeRange = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
const TIME_RANGES: TimeRange[] = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"];

interface NavHistoryChartProps {
  data: ChartDataPoint[];
}

function CustomNavTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-800 flex items-center gap-2 text-xs font-semibold">
        <span className="text-[11px] text-slate-400">{formatDateShort(String(label || ""))}:</span>
        <span className="font-extrabold text-emerald-400">
          NPR {formatNav(Number(payload[0].value || 0))}
        </span>
      </div>
    );
  }
  return null;
}

export function NavHistoryChart({ data }: NavHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("ALL");

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
  if (data.length === 0) {
    return (
      <Card className="border-border/60 rounded-[2rem] shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base font-extrabold tracking-tight">NAV History</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[260px] text-muted-foreground text-xs">
          Update NAV daily to track price history
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 rounded-[2rem] shadow-sm overflow-hidden bg-card">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-extrabold tracking-tight">NAV History</CardTitle>
            {data.length > 0 && (
              <span className="text-xs font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full self-start">
                NPR {formatNav(data[data.length - 1].value)}
              </span>
            )}
          </div>

          {/* Time Range Selector Tabs */}
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
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[250px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.3}
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
                domain={["dataMin - 0.5", "dataMax + 0.5"]}
                tickFormatter={formatNav}
                tick={{ fontSize: 10, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={false} content={<CustomNavTooltip />} />
              <defs>
                <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Line
                type="monotone"
                dataKey="value"
                name="NAV"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={filteredData.length > 15 ? false : { r: 3.5, fill: "#10b981", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0, fill: "#10b981" }}
              />

            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
