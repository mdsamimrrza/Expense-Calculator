"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioChartPoint } from "@/lib/types";
import { formatCurrencyWhole, formatDateShort } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";

interface PortfolioChartProps {
  data: PortfolioChartPoint[];
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Portfolio Value Over Time</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          Add entries to see your portfolio growth
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Portfolio Value Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
              width={50}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrencyWhole(Number(value || 0)),
                name === "portfolioValue" ? "Portfolio Value" : "Total Invested",
              ]}
              labelFormatter={(dateStr) => formatDateShort(String(dateStr || ""))}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
            />
            <Line
              type="monotone"
              dataKey="portfolioValue"
              name="Portfolio Value"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="totalInvested"
              name="Total Invested"
              stroke={CHART_COLORS.invested}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
