"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyContribution } from "@/lib/types";
import { formatCurrencyWhole, formatMonth } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";

interface MonthlyContributionsBarProps {
  data: MonthlyContribution[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as MonthlyContribution;
    return (
      <div className="bg-slate-900 text-white px-3.5 py-3 rounded-xl shadow-xl border border-slate-800 flex flex-col gap-1.5 min-w-[160px]">
        <div className="flex items-center justify-between gap-4 text-[11px] font-semibold border-b border-slate-800 pb-1.5">
          <span className="text-slate-400">{formatMonth(String(label || ""))}</span>
          <span className="font-extrabold text-blue-400">
            {formatCurrencyWhole(data.amount)}
          </span>
        </div>
        {data.breakdown && data.breakdown.length > 0 && (
          <div className="flex flex-col gap-1 pt-1">
            {data.breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 text-[11px]">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                  <span className="text-slate-300 truncate max-w-[140px]">{item.fundName}</span>
                </div>
                <span className="font-semibold text-slate-200 shrink-0">
                  {formatCurrencyWhole(item.amount).replace("NPR ", "")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
}

export function MonthlyContributionsBar({
  data,
}: MonthlyContributionsBarProps) {
  const maxVal = Math.max(...data.map((d) => d.amount), 0);
  const topTick = Math.max(Math.ceil((maxVal * 1.2) / 2000) * 2000, 4000);
  const step = topTick / 3;
  const ticks = [0, step, step * 2, topTick];

  if (data.length === 0) {
    return (
      <Card className="border-border/60 rounded-[2rem] shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold">Monthly Contributions</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[260px] text-muted-foreground text-xs">
          Add entries to see contribution history
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 rounded-[2rem] shadow-sm overflow-hidden bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-extrabold tracking-tight">Monthly Contributions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[250px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.3}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
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
              <Tooltip
                cursor={false}
                content={<CustomTooltip />}
              />
              <Bar
                dataKey="amount"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
                maxBarSize={36}
              />
              {data.length > 12 && (
                <Brush 
                  dataKey="month" 
                  height={20} 
                  stroke="#3b82f6" 
                  fill="#0f172a" 
                  tickFormatter={formatMonth}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
