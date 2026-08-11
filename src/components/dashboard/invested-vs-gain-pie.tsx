"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyWhole, formatPercentage } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";

interface InvestedVsGainPieProps {
  totalInvested: number;
  currentValue: number | null;
}

function CustomPieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-800 flex items-center gap-2 text-xs font-semibold">
        <span className="text-[11px] text-slate-400">{item.name}:</span>
        <span className="font-extrabold text-blue-400">
          NPR {formatCurrencyWhole(Number(item.value || 0)).replace("NPR ", "")}
        </span>
      </div>
    );
  }
  return null;
}

export function InvestedVsGainPie({
  totalInvested,
  currentValue,
}: InvestedVsGainPieProps) {
  if (currentValue === null || totalInvested === 0) {
    return (
      <Card className="border-border/60 rounded-[2rem] shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base font-extrabold tracking-tight">Invested vs Return</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[240px] text-muted-foreground text-xs">
          Set current NAV to see breakdown
        </CardContent>
      </Card>
    );
  }

  const gain = currentValue - totalInvested;
  const isPositive = gain >= 0;
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

  const data = [
    { name: "Invested", value: totalInvested },
    { name: isPositive ? "Gain" : "Loss", value: Math.abs(gain) },
  ];

  const colors = ["#3b82f6", isPositive ? "#10b981" : "#f43f5e"];

  return (
    <Card className="border-border/60 rounded-[2rem] shadow-sm bg-card overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-extrabold tracking-tight">Invested vs Return</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Donut Container with Absolute Centered Text */}
        <div className="relative h-[210px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={88}
                paddingAngle={4}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Absolute Center Stats */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {isPositive ? "Profit" : "Loss"}
            </span>
            <span
              className={`text-lg font-black tracking-tight ${
                isPositive ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {formatPercentage(gainPct)}
            </span>
          </div>
        </div>

        {/* Bottom Legend Badges */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
          <div className="flex items-center gap-2 bg-secondary/40 px-3 py-1.5 rounded-xl border border-border/40">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold truncate">Invested</span>
              <span className="text-xs font-extrabold text-foreground truncate">
                {formatCurrencyWhole(totalInvested)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-secondary/40 px-3 py-1.5 rounded-xl border border-border/40">
            <div
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                isPositive ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold truncate">
                {isPositive ? "Net Profit" : "Net Loss"}
              </span>
              <span
                className={`text-xs font-extrabold truncate ${
                  isPositive ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {formatCurrencyWhole(gain, true)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
