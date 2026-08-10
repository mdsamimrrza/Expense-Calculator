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
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Cumulative Fee Drag</CardTitle>
          <CardDescription className="text-xs">
            Estimated — fees are already reflected in NAV
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          Add entries to see estimated fee impact
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Cumulative Fee Drag</CardTitle>
        <CardDescription className="text-xs">
          Estimated — fees are already reflected in NAV, this shows their
          approximate cost
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid}
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fontSize: 12, fill: CHART_COLORS.text }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12, fill: CHART_COLORS.text }}
              axisLine={false}
              tickLine={false}
              width={45}
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
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <defs>
              <linearGradient id="feeDragGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={CHART_COLORS.feeDrag}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={CHART_COLORS.feeDrag}
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="cumulativeDrag"
              name="Cumulative Fee Drag"
              stroke={CHART_COLORS.feeDrag}
              strokeWidth={2}
              fill="url(#feeDragGradient)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
