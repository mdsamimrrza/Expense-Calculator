"use client";

import { useState } from "react";
import { formatCurrencyWhole, formatUnits, formatNav } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Receipt,
  Coins,
  ShieldCheck,
  Building2,
  Calculator,
  Wallet,
  Info,
  Sparkles,
  Layers,
} from "lucide-react";
import type { DashboardSummary, FundConfig } from "@/lib/types";
import { HistoryFundSelector } from "@/components/entries/history-fund-selector";

interface TaxBreakdownViewProps {
  summary: DashboardSummary;
  funds: FundConfig[];
  entriesCount: number;
  selectedFundId: string;
  activeFund?: FundConfig;
  feeDragChart: Array<{ date: string; cumulativeDrag: number }>;
}

export function TaxBreakdownView({
  summary,
  funds,
  entriesCount,
  selectedFundId,
  activeFund,
  feeDragChart,
}: TaxBreakdownViewProps) {
  const [activeTab, setActiveTab] = useState("all");

  const totalDpFeesPaid = entriesCount * 5;
  const effectiveDeployedCapital = Math.max(0, summary.totalInvested - summary.unallottedCash);
  const isPositive = (summary.gainLoss ?? 0) >= 0;

  const latestFeeDrag = feeDragChart && feeDragChart.length > 0 ? feeDragChart[feeDragChart.length - 1].cumulativeDrag : 0;
  const estimatedCgtLongTerm = summary.estimatedCgtLongTerm ?? 0;
  const estimatedCgtShortTerm = summary.estimatedCgtShortTerm ?? 0;
  const totalEstimatedCgt = estimatedCgtLongTerm + estimatedCgtShortTerm;

  const netInHandSettlement = (summary.currentValue ?? summary.totalInvested) + summary.unallottedCash - totalEstimatedCgt;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16 max-w-5xl mx-auto px-1 sm:px-0">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Tax & Settlement Ledger
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">
            Complete audit of gross deposits, SEBON DP charges, AMC management fees, capital gains tax, and net bank payout.
          </p>
        </div>

        {funds.length > 1 && (
          <div className="shrink-0">
            <HistoryFundSelector funds={funds} selectedFundId={selectedFundId} basePath="/tax-breakdown" />
          </div>
        )}
      </div>

      {/* Top 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* CARD 1: Investment & Charges */}
        <div className="bg-card rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-5 border border-border/60 shadow-sm flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                <Coins className="h-4 w-4" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Deposited
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {entriesCount} Deposits
            </span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-mono text-foreground tracking-tight">
              {formatCurrencyWhole(summary.totalInvested)}
            </h3>
            <span className="text-[11px] sm:text-xs text-amber-400 font-semibold mt-0.5 block">
              SEBON DP Fees Paid: -{formatCurrencyWhole(totalDpFeesPaid)}
            </span>
          </div>
        </div>

        {/* CARD 2: Capital Gains Tax */}
        <div className="bg-card rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-5 border border-border/60 shadow-sm flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-red-400 flex items-center justify-center border border-red-500/20 shrink-0">
                <Calculator className="h-4 w-4" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Taxes Owed
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-red-400 border border-red-500/20">
              IRD Nepal
            </span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-mono text-red-400 tracking-tight">
              {formatCurrencyWhole(totalEstimatedCgt)}
            </h3>
            <span className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-0.5 block">
              {isPositive ? "Withheld on Net Realized Profit" : "Zero Tax on Portfolio Net Loss"}
            </span>
          </div>
        </div>

        {/* CARD 3: Net Bank Settlement */}
        <div className="bg-card dark:bg-gradient-to-br dark:from-card dark:to-emerald-950/20 rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-5 border border-emerald-500/30 shadow-md flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Net Bank Payout
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Post-Tax Cash
            </span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {formatCurrencyWhole(netInHandSettlement)}
            </h3>
            <span className="text-[11px] sm:text-xs text-blue-400 font-semibold mt-0.5 block">
              (+) Rollover Wallet Cash: +{formatCurrencyWhole(summary.unallottedCash)}
            </span>
          </div>
        </div>
      </div>

      {/* Section View Control: Full-Width 5-Col Tabs on Laptop, Fund-Style Select Dropdown on Mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

        {/* Desktop View: Full-width Responsive 5-Column Tab Bar */}
        <TabsList className="hidden sm:grid grid-cols-5 w-full bg-secondary/60 p-1.5 rounded-2xl h-12 border border-border/50 shadow-sm">
          <TabsTrigger
            value="all"
            className="rounded-xl text-xs font-extrabold transition-all data-[state=active]:bg-card data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm"
          >
            All Sections
          </TabsTrigger>
          <TabsTrigger
            value="sec1"
            className="rounded-xl text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            01. Upfront Fees
          </TabsTrigger>
          <TabsTrigger
            value="sec2"
            className="rounded-xl text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            02. Units & AMC Fees
          </TabsTrigger>
          <TabsTrigger
            value="sec3"
            className="rounded-xl text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            03. Tax Schedule
          </TabsTrigger>
          <TabsTrigger
            value="sec4"
            className="rounded-xl text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            04. Bank Settlement
          </TabsTrigger>
        </TabsList>

        {/* Mobile View: Dropdown matching Fund Selector style */}
        <div className="block sm:hidden flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-card shadow-sm shrink-0">
            <Layers className="h-4 w-4 text-muted-foreground" />
          </div>
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-9 rounded-xl bg-card font-semibold text-xs border-border/50 shadow-sm">
              <SelectValue placeholder="Select section..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs font-extrabold text-emerald-400">
                All Sections
              </SelectItem>
              <SelectItem value="sec1" className="text-xs font-semibold">
                01. Upfront Fees
              </SelectItem>
              <SelectItem value="sec2" className="text-xs font-semibold">
                02. Units & AMC Fees
              </SelectItem>
              <SelectItem value="sec3" className="text-xs font-semibold">
                03. Tax Schedule
              </SelectItem>
              <SelectItem value="sec4" className="text-xs font-semibold">
                04. Bank Settlement
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ALL SECTIONS CONTENT */}
        <TabsContent value="all" className="space-y-6 mt-4">

          {/* SECTION 1 */}
          <Card className="rounded-[1.75rem] sm:rounded-[2rem] border-border/60 shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 p-4 sm:p-5 border-b border-border/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-black text-xs border border-blue-500/20 shrink-0">
                    01
                  </div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                    Initial Cash Deposits & SEBON Charges
                  </CardTitle>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                  Upfront
                </span>
              </div>
            </CardHeader>

            {/* Desktop Table View */}
            <CardContent className="p-0 hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-muted/10">
                    <TableHead className="w-[45%] text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Item Description</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Calculation Details</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Amount (NPR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Gross Cash Deposited</TableCell>
                    <TableCell className="text-muted-foreground">{entriesCount} Total SIP Transactions</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatCurrencyWhole(summary.totalInvested)}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-amber-400">(-) SEBON Upfront DP Fee Deducted</TableCell>
                    <TableCell className="text-muted-foreground">NPR 5.00 flat per deposit ({entriesCount} × NPR 5)</TableCell>
                    <TableCell className="text-right font-mono text-amber-400 font-bold">-{formatCurrencyWhole(totalDpFeesPaid)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-secondary/30 font-semibold text-foreground border-border/40">
                    <TableCell className="font-bold text-foreground">Net Cash Available for Unit Allotment</TableCell>
                    <TableCell className="text-muted-foreground font-normal">Deposited Cash - SEBON DP Fees</TableCell>
                    <TableCell className="text-right font-mono text-emerald-400 text-sm font-bold">{formatCurrencyWhole(summary.totalInvested - totalDpFeesPaid)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>

            {/* Mobile Card List View */}
            <div className="p-4 space-y-3 block sm:hidden">
              <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Gross Cash Deposited</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{entriesCount} Total Transactions</span>
                  <span className="font-mono font-bold text-foreground text-sm">{formatCurrencyWhole(summary.totalInvested)}</span>
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-1">
                <span className="text-[10px] text-amber-400 font-semibold block uppercase">(-) SEBON Upfront DP Fee</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">NPR 5.00 flat / deposit</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">-{formatCurrencyWhole(totalDpFeesPaid)}</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Net Cash for Units</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{formatCurrencyWhole(summary.totalInvested - totalDpFeesPaid)}</span>
              </div>
            </div>
          </Card>

          {/* SECTION 2 */}
          <Card className="rounded-[1.75rem] sm:rounded-[2rem] border-border/60 shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 p-4 sm:p-5 border-b border-border/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-xs border border-purple-500/20 shrink-0">
                    02
                  </div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                    Units & Embedded AMC Fees
                  </CardTitle>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                  Embedded NAV
                </span>
              </div>
            </CardHeader>

            {/* Desktop Table View */}
            <CardContent className="p-0 hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-muted/10">
                    <TableHead className="w-[45%] text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Allocation Metric</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Deduction Method & Details</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Total Allocated Units</TableCell>
                    <TableCell className="text-muted-foreground">Integer whole units allotted by SEBON rule</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatUnits(summary.totalUnits)} units</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Average Purchase NAV</TableCell>
                    <TableCell className="text-muted-foreground">Effective cost per unit</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">
                      {summary.totalUnits > 0 ? `NPR ${(summary.totalInvested / summary.totalUnits).toFixed(2)}` : "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-border/30 bg-purple-500/5">
                    <TableCell className="font-medium text-purple-400 font-bold">Embedded AMC Management Fee Drag</TableCell>
                    <TableCell className="text-muted-foreground">~{activeFund?.fee_rate_pct || 1.5}% p.a. deducted daily by AMC</TableCell>
                    <TableCell className="text-right font-mono text-purple-400 font-bold">~{formatCurrencyWhole(latestFeeDrag)} *</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Effective Deployed Capital</TableCell>
                    <TableCell className="text-muted-foreground">Cash actually converted to units</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatCurrencyWhole(effectiveDeployedCapital)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-blue-500/10 font-medium border-border/40">
                    <TableCell className="text-blue-400 font-bold">(+) Rollover Wallet Cash (Unallotted)</TableCell>
                    <TableCell className="text-muted-foreground">100% Cash retained & fully refundable upon exit</TableCell>
                    <TableCell className="text-right font-mono text-blue-400 font-bold">+{formatCurrencyWhole(summary.unallottedCash)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>

            {/* Mobile Card List View */}
            <div className="p-4 space-y-3 block sm:hidden">
              <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Total Allocated Units</span>
                  <span className="text-xs text-muted-foreground">Whole SEBON units</span>
                </div>
                <span className="font-mono font-bold text-foreground text-sm">{formatUnits(summary.totalUnits)}</span>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 space-y-1">
                <span className="text-[10px] text-purple-400 font-semibold block uppercase">Embedded AMC Fee Drag</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">~{activeFund?.fee_rate_pct || 1.5}% p.a. daily NAV fee</span>
                  <span className="font-mono font-bold text-purple-400 text-sm">~{formatCurrencyWhole(latestFeeDrag)} *</span>
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-blue-400 font-semibold block uppercase">(+) Rollover Wallet Cash</span>
                  <span className="text-xs text-muted-foreground">Refundable cash balance</span>
                </div>
                <span className="font-mono font-bold text-blue-400 text-sm">+{formatCurrencyWhole(summary.unallottedCash)}</span>
              </div>
            </div>

            <div className="p-3.5 bg-muted/20 border-t border-border/30 text-[11px] text-muted-foreground flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>* AMC Fee Note:</strong> AMC management fees are deducted daily from fund assets before daily NAV is published. They are not subtracted separately upon exit.
              </span>
            </div>
          </Card>

          {/* SECTION 3 */}
          <Card className="rounded-[1.75rem] sm:rounded-[2rem] border-border/60 shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 p-4 sm:p-5 border-b border-border/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-xs border border-amber-500/20 shrink-0">
                    03
                  </div>
                  <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                    Capital Gains Tax (CGT) Schedule
                  </CardTitle>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  IRD Nepal
                </span>
              </div>
            </CardHeader>

            {/* Desktop Table View */}
            <CardContent className="p-0 hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-muted/10">
                    <TableHead className="w-[35%] text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Tax Category</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Holding Duration & Tax Rate</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Taxable Position</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Tax Deduction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Long-Term Capital Gains Tax</TableCell>
                    <TableCell className="text-muted-foreground">Held &gt; 365 Days @ 7.5%</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{isPositive ? "Positive Realized Gain" : "Net Loss (NPR 0 Taxable)"}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatCurrencyWhole(estimatedCgtLongTerm)}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Short-Term Capital Gains Tax</TableCell>
                    <TableCell className="text-muted-foreground">Held &le; 365 Days @ 10.0%</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{isPositive ? "Positive Realized Gain" : "Net Loss (NPR 0 Taxable)"}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatCurrencyWhole(estimatedCgtShortTerm)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-secondary/30 font-semibold text-foreground border-border/40">
                    <TableCell colSpan={3} className="text-foreground">Total Estimated Tax Withholding</TableCell>
                    <TableCell className="text-right font-mono text-red-400 font-bold">
                      {formatCurrencyWhole(totalEstimatedCgt)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>

            {/* Mobile Card List View */}
            <div className="p-4 space-y-3 block sm:hidden">
              <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Long-Term Tax (&gt;365 Days)</span>
                  <span className="text-xs text-muted-foreground">7.5% Tax Rate</span>
                </div>
                <span className="font-mono font-bold text-foreground text-sm">{formatCurrencyWhole(estimatedCgtLongTerm)}</span>
              </div>
              <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Short-Term Tax (&le;365 Days)</span>
                  <span className="text-xs text-muted-foreground">10.0% Tax Rate</span>
                </div>
                <span className="font-mono font-bold text-foreground text-sm">{formatCurrencyWhole(estimatedCgtShortTerm)}</span>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-xl border border-red-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Total Tax Withheld</span>
                <span className="font-mono font-bold text-red-400 text-sm">{formatCurrencyWhole(totalEstimatedCgt)}</span>
              </div>
            </div>
          </Card>

          {/* SECTION 4 */}
          <Card className="rounded-[1.75rem] sm:rounded-[2rem] border-emerald-500/30 bg-card shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 p-4 sm:p-5 border-b border-border/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/30 shrink-0">
                    04
                  </div>
                  <CardTitle className="text-sm sm:text-base font-bold text-emerald-400">
                    Final Settlement Ledger (Bank Credit)
                  </CardTitle>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Bank Payout
                </span>
              </div>
            </CardHeader>

            {/* Desktop Table View */}
            <CardContent className="p-0 hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-muted/10">
                    <TableHead className="w-[45%] text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Settlement Step</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Formula Component</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Net Value (NPR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">1. Gross Portfolio Value (@ NAV)</TableCell>
                    <TableCell className="text-muted-foreground">{formatUnits(summary.totalUnits)} units × NPR {formatNav(summary.latestNav || 0)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatCurrencyWhole(summary.currentValue ?? summary.totalInvested)}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-blue-400">2. (+) Rollover Wallet Balance</TableCell>
                    <TableCell className="text-muted-foreground">Unused deposit cash balance</TableCell>
                    <TableCell className="text-right font-mono text-blue-400 font-bold">+{formatCurrencyWhole(summary.unallottedCash)}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-red-400">3. (-) Total Capital Gains Tax (CGT)</TableCell>
                    <TableCell className="text-muted-foreground">Long term (7.5%) + Short term (10.0%)</TableCell>
                    <TableCell className="text-right font-mono text-red-400 font-bold">-{formatCurrencyWhole(totalEstimatedCgt)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-emerald-500/10 font-bold text-xs">
                    <TableCell colSpan={2} className="py-3.5 text-foreground font-semibold uppercase tracking-wider text-[11px]">
                      FINAL REALIZED IN-HAND CASH (Bank Credit)
                    </TableCell>
                    <TableCell className="text-right font-mono text-base py-3.5 text-emerald-400 font-bold">
                      {formatCurrencyWhole(netInHandSettlement)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>

            {/* Mobile Card List View */}
            <div className="p-4 space-y-3 block sm:hidden">
              <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">1. Gross Portfolio Value</span>
                <span className="font-mono font-bold text-foreground text-xs">{formatCurrencyWhole(summary.currentValue ?? summary.totalInvested)}</span>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-between">
                <span className="text-xs text-blue-400 font-bold">2. (+) Rollover Cash</span>
                <span className="font-mono font-bold text-blue-400 text-xs">+{formatCurrencyWhole(summary.unallottedCash)}</span>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-xl border border-red-500/20 flex items-center justify-between">
                <span className="text-xs text-red-400 font-bold">3. (-) CGT Tax</span>
                <span className="font-mono font-bold text-red-400 text-xs">-{formatCurrencyWhole(totalEstimatedCgt)}</span>
              </div>
              <div className="p-4 bg-emerald-500/15 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <span className="text-xs font-black text-foreground uppercase tracking-tight">Net In-Hand Bank Cash</span>
                <span className="font-mono font-black text-emerald-400 text-base">{formatCurrencyWhole(netInHandSettlement)}</span>
              </div>
            </div>
          </Card>

        </TabsContent>

        {/* INDIVIDUAL TABS WITH RESPONSIVE VIEWS */}
        <TabsContent value="sec1">
          <Card className="rounded-[1.75rem] sm:rounded-[2rem] border-border/60 shadow-sm overflow-hidden bg-card mt-4">
            <CardHeader className="bg-muted/30 p-4 sm:p-5 border-b border-border/40">
              <CardTitle className="text-base font-bold text-foreground">
                Section 1: Initial Cash Deposits & SEBON Upfront Charges
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-muted/10">
                    <TableHead className="w-[45%] text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Item Description</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Calculation Details</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Amount (NPR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Gross Cash Deposited</TableCell>
                    <TableCell className="text-muted-foreground">{entriesCount} Total SIP Transactions</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatCurrencyWhole(summary.totalInvested)}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-amber-400">(-) SEBON Upfront DP Fee Deducted</TableCell>
                    <TableCell className="text-muted-foreground">NPR 5.00 flat per deposit ({entriesCount} × NPR 5)</TableCell>
                    <TableCell className="text-right font-mono text-amber-400 font-bold">-{formatCurrencyWhole(totalDpFeesPaid)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-secondary/30 font-semibold text-foreground border-border/40">
                    <TableCell className="font-bold text-foreground">Net Cash Available for Unit Allotment</TableCell>
                    <TableCell className="text-muted-foreground font-normal">Deposited Cash - SEBON DP Fees</TableCell>
                    <TableCell className="text-right font-mono text-emerald-400 text-sm font-bold">{formatCurrencyWhole(summary.totalInvested - totalDpFeesPaid)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            <div className="p-4 space-y-3 block sm:hidden">
              <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Gross Cash Deposited</span>
                <span className="font-mono font-bold text-foreground text-xs">{formatCurrencyWhole(summary.totalInvested)}</span>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center justify-between">
                <span className="text-xs text-amber-400 font-bold">(-) SEBON DP Fees</span>
                <span className="font-mono font-bold text-amber-400 text-xs">-{formatCurrencyWhole(totalDpFeesPaid)}</span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Net Cash for Units</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">{formatCurrencyWhole(summary.totalInvested - totalDpFeesPaid)}</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sec2">
          <Card className="rounded-[1.75rem] sm:rounded-[2rem] border-border/60 shadow-sm overflow-hidden bg-card mt-4">
            <CardHeader className="bg-muted/30 p-4 sm:p-5 border-b border-border/40">
              <CardTitle className="text-base font-bold text-foreground">
                Section 2: Deployed Capital & Embedded AMC Management Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-muted/10">
                    <TableHead className="w-[45%] text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Allocation Metric</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Deduction Method & Details</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Total Allocated Units</TableCell>
                    <TableCell className="text-muted-foreground">Integer whole units allotted by SEBON rule</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatUnits(summary.totalUnits)} units</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Average Purchase NAV</TableCell>
                    <TableCell className="text-muted-foreground">Effective cost per unit</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">
                      {summary.totalUnits > 0 ? `NPR ${(summary.totalInvested / summary.totalUnits).toFixed(2)}` : "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-border/30 bg-purple-500/5">
                    <TableCell className="font-medium text-purple-400 font-bold">Embedded AMC Management Fee Drag</TableCell>
                    <TableCell className="text-muted-foreground">~{activeFund?.fee_rate_pct || 1.5}% p.a. deducted daily by AMC</TableCell>
                    <TableCell className="text-right font-mono text-purple-400 font-bold">~{formatCurrencyWhole(latestFeeDrag)} *</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Effective Deployed Capital</TableCell>
                    <TableCell className="text-muted-foreground">Cash actually converted to units</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatCurrencyWhole(effectiveDeployedCapital)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-blue-500/10 font-medium border-border/40">
                    <TableCell className="text-blue-400 font-bold">(+) Rollover Wallet Cash (Unallotted)</TableCell>
                    <TableCell className="text-muted-foreground">100% Cash retained & fully refundable upon exit</TableCell>
                    <TableCell className="text-right font-mono text-blue-400 font-bold">+{formatCurrencyWhole(summary.unallottedCash)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            <div className="p-4 space-y-3 block sm:hidden">
              <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Allocated Units</span>
                <span className="font-mono font-bold text-foreground text-xs">{formatUnits(summary.totalUnits)}</span>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 flex items-center justify-between">
                <span className="text-xs text-purple-400 font-bold">Embedded AMC Fee</span>
                <span className="font-mono font-bold text-purple-400 text-xs">~{formatCurrencyWhole(latestFeeDrag)} *</span>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-between">
                <span className="text-xs text-blue-400 font-bold">(+) Rollover Cash</span>
                <span className="font-mono font-bold text-blue-400 text-xs">+{formatCurrencyWhole(summary.unallottedCash)}</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sec3">
          <Card className="rounded-[1.75rem] sm:rounded-[2rem] border-border/60 shadow-sm overflow-hidden bg-card mt-4">
            <CardHeader className="bg-muted/30 p-4 sm:p-5 border-b border-border/40">
              <CardTitle className="text-base font-bold text-foreground">
                Section 3: Capital Gains Tax (CGT) Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-muted/10">
                    <TableHead className="w-[35%] text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Tax Category</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Holding Duration & Tax Rate</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Taxable Position</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Tax Deduction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Long-Term Capital Gains Tax</TableCell>
                    <TableCell className="text-muted-foreground">Held &gt; 365 Days @ 7.5%</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{isPositive ? "Positive Realized Gain" : "Net Loss (NPR 0 Taxable)"}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatCurrencyWhole(estimatedCgtLongTerm)}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">Short-Term Capital Gains Tax</TableCell>
                    <TableCell className="text-muted-foreground">Held &le; 365 Days @ 10.0%</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{isPositive ? "Positive Realized Gain" : "Net Loss (NPR 0 Taxable)"}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatCurrencyWhole(estimatedCgtShortTerm)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-secondary/30 font-semibold text-foreground border-border/40">
                    <TableCell colSpan={3} className="text-foreground">Total Estimated Tax Withholding</TableCell>
                    <TableCell className="text-right font-mono text-red-400 font-bold">{formatCurrencyWhole(totalEstimatedCgt)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            <div className="p-4 space-y-3 block sm:hidden">
              <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Long-Term CGT (&gt;365 Days)</span>
                <span className="font-mono font-bold text-foreground text-xs">{formatCurrencyWhole(estimatedCgtLongTerm)}</span>
              </div>
              <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Short-Term CGT (&le;365 Days)</span>
                <span className="font-mono font-bold text-foreground text-xs">{formatCurrencyWhole(estimatedCgtShortTerm)}</span>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-xl border border-red-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Total Tax Withheld</span>
                <span className="font-mono font-bold text-red-400 text-xs">{formatCurrencyWhole(totalEstimatedCgt)}</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sec4">
          <Card className="rounded-[1.75rem] sm:rounded-[2rem] border-emerald-500/30 bg-card shadow-sm overflow-hidden mt-4">
            <CardHeader className="bg-muted/30 p-4 sm:p-5 border-b border-border/40">
              <CardTitle className="text-base font-bold text-emerald-400">
                Section 4: Final Settlement Ledger (Bank Credit)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-muted/10">
                    <TableHead className="w-[45%] text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Settlement Step</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Formula Component</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Net Value (NPR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-foreground">1. Gross Portfolio Value (@ NAV)</TableCell>
                    <TableCell className="text-muted-foreground">{formatUnits(summary.totalUnits)} units × NPR {formatNav(summary.latestNav || 0)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">{formatCurrencyWhole(summary.currentValue ?? summary.totalInvested)}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-blue-400">2. (+) Rollover Wallet Balance</TableCell>
                    <TableCell className="text-muted-foreground">Unused deposit cash balance</TableCell>
                    <TableCell className="text-right font-mono text-blue-400 font-bold">+{formatCurrencyWhole(summary.unallottedCash)}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium text-red-400">3. (-) Total Capital Gains Tax (CGT)</TableCell>
                    <TableCell className="text-muted-foreground">Long term (7.5%) + Short term (10.0%)</TableCell>
                    <TableCell className="text-right font-mono text-red-400 font-bold">-{formatCurrencyWhole(totalEstimatedCgt)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-emerald-500/10 font-bold text-xs">
                    <TableCell colSpan={2} className="py-3.5 text-foreground font-semibold uppercase tracking-wider text-[11px]">
                      FINAL REALIZED IN-HAND CASH (Bank Credit)
                    </TableCell>
                    <TableCell className="text-right font-mono text-base py-3.5 text-emerald-400 font-bold">
                      {formatCurrencyWhole(netInHandSettlement)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            <div className="p-4 space-y-3 block sm:hidden">
              <div className="p-3 bg-secondary/40 rounded-xl border border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">1. Gross Portfolio Value</span>
                <span className="font-mono font-bold text-foreground text-xs">{formatCurrencyWhole(summary.currentValue ?? summary.totalInvested)}</span>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-between">
                <span className="text-xs text-blue-400 font-bold">2. (+) Rollover Cash</span>
                <span className="font-mono font-bold text-blue-400 text-xs">+{formatCurrencyWhole(summary.unallottedCash)}</span>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-xl border border-red-500/20 flex items-center justify-between">
                <span className="text-xs text-red-400 font-bold">3. (-) CGT Tax</span>
                <span className="font-mono font-bold text-red-400 text-xs">-{formatCurrencyWhole(totalEstimatedCgt)}</span>
              </div>
              <div className="p-4 bg-emerald-500/15 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <span className="text-xs font-black text-foreground uppercase tracking-tight">Net In-Hand Cash</span>
                <span className="font-mono font-black text-emerald-400 text-base">{formatCurrencyWhole(netInHandSettlement)}</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
