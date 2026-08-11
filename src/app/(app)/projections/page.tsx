"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectionTable } from "@/components/projections/projection-table";
import { ProjectionChart } from "@/components/projections/projection-chart";
import { getDashboardData } from "@/lib/actions/dashboard";
import {
  calculateProjectionTable,
  calculateProjectionChartData,
} from "@/lib/calculations/projections";
import type {
  FundConfig,
  ProjectionRow,
  ProjectionChartPoint,
  ReturnScenario,
  StepUpRate,
} from "@/lib/types";
import { RETURN_SCENARIOS, STEP_UP_OPTIONS } from "@/lib/constants";
import { formatCurrencyWhole } from "@/lib/format";
import { Loader2 } from "lucide-react";

export default function ProjectionsPage() {
  const [funds, setFunds] = useState<FundConfig[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>("all");
  const [returnPct, setReturnPct] = useState<ReturnScenario>(10);
  const [stepUpPct, setStepUpPct] = useState<StepUpRate>(0);

  const [currentCorpus, setCurrentCorpus] = useState<number>(0);
  const [monthlySip, setMonthlySip] = useState<number>(5000);
  const [historicalData, setHistoricalData] = useState<Array<{ date: string; value: number }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const res = await getDashboardData(selectedFundId);
      if (res.success && res.data) {
        setFunds(res.data.funds);

        const summary = res.data.summary;
        const unitsVal =
          summary.totalUnits > 0 && summary.latestNav
            ? summary.totalUnits * summary.latestNav
            : summary.totalInvested || 0;
        setCurrentCorpus(unitsVal);

        // Find active monthly SIP amount from fund config
        if (selectedFundId !== "all") {
          const fund = res.data.funds.find((f) => f.id === selectedFundId);
          if (fund) setMonthlySip(Number(fund.monthly_sip));
        } else if (res.data.funds.length > 0) {
          const totalSip = res.data.funds.reduce((sum, f) => sum + Number(f.monthly_sip), 0);
          setMonthlySip(totalSip);
        }

        setHistoricalData(
          res.data.portfolioChart.map((p) => ({
            date: p.date,
            value: p.portfolioValue,
          }))
        );
      }
      setIsLoading(false);
    }

    loadData();
  }, [selectedFundId]);

  const projectionParams = {
    currentCorpus,
    monthlySip,
    annualReturnPct: returnPct,
    stepUpPct,
    yearsToProject: 20,
  };

  const tableRows: ProjectionRow[] = calculateProjectionTable(projectionParams);
  const chartData: ProjectionChartPoint[] = calculateProjectionChartData(
    historicalData,
    projectionParams
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SIP Growth Projections</h1>
        <p className="text-sm text-muted-foreground">
          Simulate future corpus compounding based on your current portfolio and step-up preferences.
        </p>
      </div>

      {/* Control Panel */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Projection Assumptions</CardTitle>
          <CardDescription className="text-xs">
            Adjust return rates and annual step-up percentages to see your future portfolio trajectory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fund Selector */}
            {funds.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="fund-select">Fund Scope</Label>
                <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                  <SelectTrigger id="fund-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funds Combined</SelectItem>
                    {funds.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.fund_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Expected Annual Return */}
            <div className="space-y-2">
              <Label htmlFor="return-select">Annualized Return Scenario</Label>
              <Select
                value={returnPct.toString()}
                onValueChange={(v) => setReturnPct(parseInt(v) as ReturnScenario)}
              >
                <SelectTrigger id="return-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_SCENARIOS.map((r) => (
                    <SelectItem key={r} value={r.toString()}>
                      {r}% CAGR
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step Up Rate */}
            <div className="space-y-2">
              <Label htmlFor="stepup-select">Annual SIP Step-Up</Label>
              <Select
                value={stepUpPct.toString()}
                onValueChange={(v) => setStepUpPct(parseInt(v) as StepUpRate)}
              >
                <SelectTrigger id="stepup-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEP_UP_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s.toString()}>
                      {s === 0 ? "Flat (0% increase)" : `+${s}% every year`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Starting Corpus Badge */}
            <div className="space-y-2">
              <Label>Seeded Starting Corpus</Label>
              <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/30 font-mono text-sm font-semibold tabular-nums text-primary">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  formatCurrencyWhole(currentCorpus)
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Growth Chart */}
      <ProjectionChart data={chartData} />

      {/* Milestone Table */}
      <ProjectionTable rows={tableRows} />
    </div>
  );
}
