
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
import { Info, Briefcase, Landmark, ShieldCheck, Calculator } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { FeeDragPoint } from "@/lib/types";
import { formatCurrencyWhole, formatDateShort } from "@/lib/format";
import { FUND_PRESETS } from "@/lib/constants";

interface FeeDragAreaProps {
  data: FeeDragPoint[];
  feeRatePct?: number;
  fundName?: string;
}

export function FeeDragArea({ data, feeRatePct = 1.8, fundName }: FeeDragAreaProps) {
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

  // Sanitize incoming data to ensure Recharts gets finite numeric values.
  const sanitized = data
    .map((pt) => {
      const cumulativeDrag = Number(pt.cumulativeDrag);
      const monthlyDrag = Number(pt.monthlyDrag);
      const date = pt.date ? String(pt.date) : "";
      return {
        ...pt,
        date,
        cumulativeDrag: Number.isFinite(cumulativeDrag) ? cumulativeDrag : 0,
        monthlyDrag: Number.isFinite(monthlyDrag) ? monthlyDrag : 0,
      } as typeof pt;
    })
    .filter((pt) => pt.date !== "" && Number.isFinite(pt.cumulativeDrag) && Number.isFinite(pt.monthlyDrag));

  const totalDrag = sanitized.length > 0 ? sanitized[sanitized.length - 1].cumulativeDrag : 0;
  
  // Prefer a fund-specific breakdown if we have a matching preset; otherwise
  // fall back to the standard 1.5 / 0.2 / 0.1 ratios scaled to the provided feeRatePct.
  let managementPct: number;
  let depositoryPct: number;
  let supervisionPct: number;
  let managementAmt: number;
  let depositoryAmt: number;
  let supervisionAmt: number;

  const preset = fundName ? FUND_PRESETS.find((p) => p.name === fundName) : undefined;

  if (preset && preset.feeBreakdown) {
    const b = preset.feeBreakdown;
    const breakdownTotal = (b.management || 0) + (b.depository || 0) + (b.supervision || 0);
    if (breakdownTotal > 0.0001) {
      managementPct = b.management;
      depositoryPct = b.depository;
      supervisionPct = b.supervision;

      managementAmt = (b.management / (breakdownTotal || feeRatePct)) * totalDrag;
      depositoryAmt = (b.depository / (breakdownTotal || feeRatePct)) * totalDrag;
      supervisionAmt = (b.supervision / (breakdownTotal || feeRatePct)) * totalDrag;
    } else {
      managementPct = (1.5 / 1.8) * feeRatePct;
      depositoryPct = (0.2 / 1.8) * feeRatePct;
      supervisionPct = (0.1 / 1.8) * feeRatePct;

      managementAmt = (1.5 / 1.8) * totalDrag;
      depositoryAmt = (0.2 / 1.8) * totalDrag;
      supervisionAmt = (0.1 / 1.8) * totalDrag;
    }
  } else {
    managementPct = (1.5 / 1.8) * feeRatePct;
    depositoryPct = (0.2 / 1.8) * feeRatePct;
    supervisionPct = (0.1 / 1.8) * feeRatePct;

    managementAmt = (1.5 / 1.8) * totalDrag;
    depositoryAmt = (0.2 / 1.8) * totalDrag;
    supervisionAmt = (0.1 / 1.8) * totalDrag;
  }

  return (
    <Card className="border-border/60 rounded-[2rem] shadow-sm overflow-hidden bg-card relative group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-extrabold tracking-tight">Cumulative Fee Drag</CardTitle>
            <CardDescription className="text-xs">
              Estimated — fees are already reflected in NAV, this shows their approximate cost
            </CardDescription>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <button className="group flex items-center gap-1.5 px-2.5 py-1 -mr-1 text-xs font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all flex-shrink-0 border border-transparent hover:border-red-500/20">
                <span>Details</span>
                <Info className="h-3.5 w-3.5" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[95vw] rounded-[2rem] p-6 shadow-2xl border-border overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-background to-background -z-10" />
              
              <DialogHeader className="text-left relative">
                <div className="absolute -top-12 -right-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
                <DialogTitle className="flex items-center gap-2 text-xl font-extrabold">
                  <Calculator className="h-5 w-5 text-red-500" />
                  Fee Drag Breakdown
                </DialogTitle>
                <DialogDescription className="text-xs">
                  How the <strong className="text-foreground">{feeRatePct.toFixed(2)}%</strong> Annual Fee Rate is distributed across your portfolio's lifetime.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="flex flex-col gap-3">
                  
                  {/* Management Fee Row */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/40 hover:bg-secondary/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Management Fees</p>
                        <p className="text-[10px] text-muted-foreground">{managementPct.toFixed(2)}% of AUM</p>
                      </div>
                    </div>
                    <span className="font-bold text-foreground">{formatCurrencyWhole(managementAmt)}</span>
                  </div>

                  {/* Depository Fee Row */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/40 hover:bg-secondary/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                        <Landmark className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Depository Fees</p>
                        <p className="text-[10px] text-muted-foreground">{depositoryPct.toFixed(2)}% of AUM</p>
                      </div>
                    </div>
                    <span className="font-bold text-foreground">{formatCurrencyWhole(depositoryAmt)}</span>
                  </div>

                  {/* Supervision Fee Row */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/40 hover:bg-secondary/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Scheme Supervision</p>
                        <p className="text-[10px] text-muted-foreground">{supervisionPct.toFixed(2)}% of AUM</p>
                      </div>
                    </div>
                    <span className="font-bold text-foreground">{formatCurrencyWhole(supervisionAmt)}</span>
                  </div>

                  {/* Total Row */}
                  <div className="mt-2 flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20">
                    <div>
                      <p className="text-sm font-extrabold text-foreground">Total Fee Drag</p>
                      <p className="text-[10px] text-red-500/80 font-medium">{feeRatePct.toFixed(2)}% of AUM</p>
                    </div>
                    <span className="text-lg font-black text-red-500">{formatCurrencyWhole(totalDrag)}</span>
                  </div>
                </div>
                
                <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                  These fees are deducted continuously from your mutual fund's NAV. This table estimates exactly how much of your wealth has been absorbed by each specific fee category over the lifetime of your SIP.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[250px] w-full pt-2" style={{ minHeight: 220 }}>
          {/* Use a fixed pixel height so ResponsiveContainer can measure reliably */}
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={sanitized}
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
                minTickGap={30}
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
