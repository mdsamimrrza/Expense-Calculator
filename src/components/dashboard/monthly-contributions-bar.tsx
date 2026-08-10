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

export function MonthlyContributionsBar({
  data,
}: MonthlyContributionsBarProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Monthly Contributions</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          Add entries to see contribution history
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Monthly Contributions</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid}
              opacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fontSize: 11, fill: CHART_COLORS.text }}
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
              formatter={(value) => [
                formatCurrencyWhole(Number(value || 0)),
                "Contributed",
              ]}
              labelFormatter={(monthKey) => formatMonth(String(monthKey || ""))}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Bar
              dataKey="amount"
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
