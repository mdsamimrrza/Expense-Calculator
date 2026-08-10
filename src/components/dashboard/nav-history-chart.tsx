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
import { CHART_COLORS } from "@/lib/constants";

interface NavHistoryChartProps {
  data: ChartDataPoint[];
}

export function NavHistoryChart({ data }: NavHistoryChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">NAV History</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          Add entries to see NAV history
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">NAV History</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
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
              domain={["dataMin - 1", "dataMax + 1"]}
              tickFormatter={formatNav}
              tick={{ fontSize: 12, fill: CHART_COLORS.text }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip
              formatter={(value) => [formatNav(Number(value || 0)), "NAV"]}
              labelFormatter={(dateStr) => formatDateShort(String(dateStr || ""))}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              name="NAV"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
