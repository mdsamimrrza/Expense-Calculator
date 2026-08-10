"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyWhole, formatPercentage } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";

interface InvestedVsGainPieProps {
  totalInvested: number;
  currentValue: number | null;
}

export function InvestedVsGainPie({
  totalInvested,
  currentValue,
}: InvestedVsGainPieProps) {
  if (currentValue === null || totalInvested === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Invested vs Gain</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          Set current NAV to see the breakdown
        </CardContent>
      </Card>
    );
  }

  const gain = currentValue - totalInvested;
  const isPositive = gain >= 0;

  const data = [
    { name: "Invested", value: totalInvested },
    { name: isPositive ? "Gain" : "Loss", value: Math.abs(gain) },
  ];

  const colors = [
    CHART_COLORS.invested,
    isPositive ? CHART_COLORS.positive : CHART_COLORS.negative,
  ];

  const gainPct = (gain / totalInvested) * 100;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Invested vs Gain</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index]}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrencyWhole(Number(value || 0))}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="flex flex-col items-center -mt-[190px] mb-[120px] pointer-events-none">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {isPositive ? "Gain" : "Loss"}
          </span>
          <span
            className={`text-lg font-bold tabular-nums ${
              isPositive ? "text-positive" : "text-negative"
            }`}
          >
            {formatPercentage(gainPct)}
          </span>
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2">
          {data.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: colors[i] }}
              />
              <span className="text-xs text-muted-foreground">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
