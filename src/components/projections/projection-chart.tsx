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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ProjectionChartPoint } from "@/lib/types";
import { formatCurrencyWhole, formatDateShort } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";

interface ProjectionChartProps {
  data: ProjectionChartPoint[];
}

export function ProjectionChart({ data }: ProjectionChartProps) {
  // Separate into historical vs projected for distinct line styling
  const actualPoints = data.filter((d) => d.type === "actual");
  const projectedPoints = data.filter((d) => d.type === "projected");

  // Create a merged dataset where dates are key, actualValue is populated for actuals, projectedValue for projections
  const mergedMap = new Map<string, { date: string; actualValue?: number; projectedValue?: number }>();

  // Add actuals
  actualPoints.forEach((p) => {
    mergedMap.set(p.date, { date: p.date, actualValue: p.value });
  });

  // Bridge point: last actual point is also start of projection line
  const lastActual = actualPoints[actualPoints.length - 1];
  if (lastActual) {
    const existing = mergedMap.get(lastActual.date) || { date: lastActual.date };
    mergedMap.set(lastActual.date, { ...existing, projectedValue: lastActual.value });
  }

  // Add projections (sampled quarterly/annually for clean chart performance)
  projectedPoints.forEach((p, idx) => {
    // Only sample every 3 months for projection performance
    if (idx % 3 === 0 || idx === projectedPoints.length - 1) {
      const existing = mergedMap.get(p.date) || { date: p.date };
      mergedMap.set(p.date, { ...existing, projectedValue: p.value });
    }
  });

  const chartData = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Historical vs Projected Corpus Growth</CardTitle>
        <CardDescription className="text-xs">
          Solid line represents historical actual entries; Dotted line represents future projection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350} minWidth={0}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
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
              tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`}
              tick={{ fontSize: 12, fill: CHART_COLORS.text }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrencyWhole(Number(value || 0)),
                name === "actualValue" ? "Historical Actual" : "Projected Growth",
              ]}
              labelFormatter={(dateStr) => formatDateShort(String(dateStr || ""))}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
            
            {/* Historical Actual Line - Solid */}
            <Line
              type="monotone"
              dataKey="actualValue"
              name="Historical Actual"
              stroke={CHART_COLORS.primary}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />

            {/* Projected Line - Dotted / Dashed */}
            <Line
              type="monotone"
              dataKey="projectedValue"
              name="Projected Future"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              strokeDasharray="6 6"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
