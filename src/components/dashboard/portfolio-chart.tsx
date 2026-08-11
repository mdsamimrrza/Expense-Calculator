"use client";

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
import type { PortfolioChartPoint } from "@/lib/types";
import { formatCurrencyWhole, formatDateShort } from "@/lib/format";

interface PortfolioChartProps {
  data: PortfolioChartPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs font-semibold space-y-1">
        <span className="text-[11px] text-slate-400 block">{formatDateShort(String(label || ""))}</span>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
          <span className="text-slate-300">Portfolio:</span>
          <span className="font-extrabold text-blue-400">
            {formatCurrencyWhole(Number(payload[0]?.value || 0))}
          </span>
        </div>
        {payload[1] && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
            <span className="text-slate-300">Invested:</span>
            <span className="font-extrabold text-slate-300">
              {formatCurrencyWhole(Number(payload[1]?.value || 0))}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  const maxVal = Math.max(
    ...data.flatMap((d) => [d.portfolioValue, d.totalInvested]),
    0
  );
  const topTick = Math.max(Math.ceil((maxVal * 1.2) / 2000) * 2000, 4000);
  const step = topTick / 3;
  const ticks = [0, step, step * 2, topTick];

  if (data.length === 0) {
    return (
      <Card className="border-border/60 rounded-[2rem] shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base font-extrabold tracking-tight">Portfolio Value Over Time</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[260px] text-muted-foreground text-xs">
          Add entries to see your portfolio growth
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 rounded-[2rem] shadow-sm overflow-hidden bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-extrabold tracking-tight">Portfolio Value Over Time</CardTitle>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-5 rounded-full bg-blue-500 inline-block" />
              Portfolio
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-[2px] w-5 border-t-2 border-dashed border-slate-400 inline-block" />
              Invested
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[260px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                dot={{ r: 3.5, fill: "#3b82f6", strokeWidth: 0 }}
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
