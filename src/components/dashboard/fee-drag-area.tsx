"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { FeeDragPoint } from "@/lib/types";
import { formatCurrencyWhole, formatDateShort } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";

interface FeeDragAreaProps {
  data: FeeDragPoint[];
}

export function FeeDragArea({ data }: FeeDragAreaProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border/60 rounded-[2rem] shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold">Cumulative Fee Drag</CardTitle>
          <CardDescription className="text-xs">
            Estimated — fees are already reflected in NAV
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[260px] text-muted-foreground text-xs">
          Add entries to see estimated fee impact
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 rounded-[2rem] shadow-sm overflow-hidden bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-extrabold tracking-tight">Cumulative Fee Drag</CardTitle>
        <CardDescription className="text-xs">
          Estimated — fees are already reflected in NAV, this shows their approximate cost
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[250px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tick={{ fontSize: 10, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrencyWhole(Number(value || 0)),
                  name === "cumulativeDrag"
                    ? "Cumulative Fee Drag"
                    : "Monthly Fee Drag",
                ]}
                labelFormatter={(dateStr) => formatDateShort(String(dateStr || ""))}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "14px",
                  fontSize: "12px",
                  fontWeight: "600",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <defs>
                <linearGradient id="feeDragGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="#ef4444"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="#ef4444"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="cumulativeDrag"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#feeDragGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
