import type { Metadata } from "next";
import { getDashboardData } from "@/lib/actions/dashboard";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { InvestedVsGainPie } from "@/components/dashboard/invested-vs-gain-pie";
import { MonthlyContributionsBar } from "@/components/dashboard/monthly-contributions-bar";
import { NavHistoryChart } from "@/components/dashboard/nav-history-chart";
import { FeeDragArea } from "@/components/dashboard/fee-drag-area";
import { LatestNavInput } from "@/components/dashboard/latest-nav-input";
import { EntryForm } from "@/components/entries/entry-form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard",
};

interface DashboardPageProps {
  searchParams: {
    fund?: string;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const selectedFundId = searchParams.fund || "all";
  const result = await getDashboardData(selectedFundId);

  if (!result.success || !result.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <p className="text-destructive font-medium">Failed to load dashboard data.</p>
        <p className="text-sm text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  const {
    summary,
    funds,
    portfolioChart,
    monthlyContributions,
    navHistory,
    feeDragChart,
  } = result.data;

  // If user has no funds configured, redirect to onboarding
  if (funds.length === 0) {
    redirect("/onboarding");
  }

  const activeFund = funds.find((f) => f.id === selectedFundId) || funds[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SIP Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track your mutual fund performance, returns, and fee impact.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <EntryForm funds={funds} defaultFundId={activeFund?.id} />
        </div>
      </div>

      {/* Fund Selector & Latest NAV inline row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/50">
        <Tabs defaultValue={selectedFundId} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
            {funds.length > 1 && (
              <TabsTrigger value="all" asChild>
                <Link href="/dashboard?fund=all">All Funds</Link>
              </TabsTrigger>
            )}
            {funds.map((fund) => (
              <TabsTrigger key={fund.id} value={fund.id} asChild>
                <Link href={`/dashboard?fund=${fund.id}`}>{fund.fund_name}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {selectedFundId !== "all" && activeFund && (
          <LatestNavInput
            fundId={activeFund.id}
            currentNav={activeFund.latest_nav ? Number(activeFund.latest_nav) : null}
            currentNavDate={activeFund.latest_nav_date}
          />
        )}
      </div>

      {/* Summary Cards Grid */}
      <SummaryCards summary={summary} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PortfolioChart data={portfolioChart} />
        </div>
        <div>
          <InvestedVsGainPie
            totalInvested={summary.totalInvested}
            currentValue={summary.currentValue}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <MonthlyContributionsBar data={monthlyContributions} />
        </div>
        <div>
          <NavHistoryChart data={navHistory} />
        </div>
        <div>
          <FeeDragArea data={feeDragChart} />
        </div>
      </div>
    </div>
  );
}
