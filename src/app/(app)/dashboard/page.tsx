import type { Metadata } from "next";
import { getDashboardData } from "@/lib/actions/dashboard";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { InvestedVsGainPie } from "@/components/dashboard/invested-vs-gain-pie";
import { MonthlyContributionsBar } from "@/components/dashboard/monthly-contributions-bar";
import { NavHistoryChart } from "@/components/dashboard/nav-history-chart";
import { FeeDragArea } from "@/components/dashboard/fee-drag-area";
import { LatestNavInput } from "@/components/dashboard/latest-nav-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { FundConfig } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard",
};

interface DashboardPageProps {
  searchParams: Promise<{
    fund?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const selectedFundId = params.fund || "all";
  const result = await getDashboardData(selectedFundId);

  if ("redirect" in result && typeof result.redirect === "string") {
    redirect(result.redirect);
  }


  if (!result.success || !result.data) {
    redirect("/onboarding");
  }

  const {
    summary,
    funds,
    portfolioChart,
    monthlyContributions,
    navHistory,
    feeDragChart,
  } = result.data;

  if (funds.length === 0) {
    redirect("/onboarding");
  }

  const activeFund = funds.find((f: FundConfig) => f.id === selectedFundId) || funds[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 -mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SIP Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track your mutual fund performance, returns, and fee impact.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto min-w-0">
          {/* Fund tabs removed as requested, relying on the dropdown in Portfolio Value card */}

          {selectedFundId !== "all" && activeFund && (
            <div className="flex-shrink-0 mt-1 sm:mt-0">
              <LatestNavInput
                fundId={activeFund.id}
                currentNav={activeFund.latest_nav ? Number(activeFund.latest_nav) : null}
                currentNavDate={activeFund.latest_nav_date}
              />
            </div>
          )}
        </div>
      </div>

      {/* 1. Top 4 KPI Summary Cards & Personal Summary */}
      <SummaryCards
        summary={summary}
        funds={funds}
        selectedFundId={selectedFundId}
        activeFund={activeFund}
        mobileChartSlot={
          <div className="block sm:hidden w-full">
            <PortfolioChart data={portfolioChart} summary={summary} />
          </div>
        }
      />

      {/* 2. Main Portfolio Growth Interactive Line Chart */}
      <div className="hidden sm:block">
        <PortfolioChart data={portfolioChart} summary={summary} />
      </div>

      {/* 3. Secondary Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 flex flex-col gap-6">
          <NavHistoryChart data={navHistory} />
          <MonthlyContributionsBar data={monthlyContributions} />
        </div>

        <div className="lg:col-span-6 flex flex-col gap-6">
          <InvestedVsGainPie
            totalInvested={summary.totalInvested}
            currentValue={summary.currentValue}
          />
          <FeeDragArea
            data={feeDragChart}
            feeRatePct={
              selectedFundId !== "all" && activeFund
                ? Number(activeFund.fee_rate_pct || 0)
                : funds.length > 0
                  ? funds.reduce((sum: number, f: FundConfig) => sum + Number(f.fee_rate_pct || 0), 0) / funds.length
                  : 0
            }
            fundName={selectedFundId !== "all" && activeFund ? activeFund.fund_name : undefined}
          />
        </div>
      </div>
    </div>
  );
}
