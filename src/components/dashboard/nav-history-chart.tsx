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
import type { ChartDataPoint } from "@/lib/types";
import { formatNav, formatDateShort } from "@/lib/format";

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
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-extrabold tracking-tight">NAV History</CardTitle>
          {data.length > 0 && (
            <span className="text-xs font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              NPR {formatNav(data[data.length - 1].value)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[250px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={data}
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
                dot={{ r: 3.5, fill: "#10b981", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0, fill: "#10b981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
