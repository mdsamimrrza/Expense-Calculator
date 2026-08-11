"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
    return (
      <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-800 flex items-center gap-2 text-xs font-semibold">
        <span className="text-[11px] text-slate-400">{formatMonth(String(label || ""))}:</span>
        <span className="font-extrabold text-blue-400">
          NPR {formatCurrencyWhole(Number(payload[0].value || 0)).replace("NPR ", "")}
        </span>
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
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
