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
import { ThemeToggle } from "@/components/layout/theme-toggle";

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
      {/* Desktop Header & Fund Selector (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-col space-y-6">
        <div className="flex sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SIP Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Track your mutual fund performance, returns, and fee impact.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:block border border-border/50 rounded-full p-0.5">
              <ThemeToggle />
            </div>
            <EntryForm funds={funds} defaultFundId={activeFund?.id} />
          </div>
        </div>

        <div className="flex sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/50">
          <Tabs defaultValue={selectedFundId} className="w-full sm:w-auto">
            <TabsList className="w-full sm:w-auto flex">
              {funds.length > 1 && (
                <TabsTrigger value="all" asChild>
                  <Link href="/dashboard?fund=all">All Funds</Link>
                </TabsTrigger>
              )}
              {funds.map((fund) => (
                <TabsTrigger key={fund.id} value={fund.id}>
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
      </div>

      {/* Main Grid Layout (Leetcode Profile Style) */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar - Profile & Summary (lg:col-span-4 xl:col-span-3) */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-6">
          <SummaryCards
            summary={summary}
            portfolioChart={portfolioChart}
            navHistory={navHistory}
            funds={funds}
            selectedFundId={selectedFundId}
            activeFund={activeFund}
          />
          <InvestedVsGainPie
            totalInvested={summary.totalInvested}
            currentValue={summary.currentValue}
          />
        </div>

        {/* Right Main Content (lg:col-span-8 xl:col-span-8) */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-6">
          <PortfolioChart data={portfolioChart} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NavHistoryChart data={navHistory} />
            <MonthlyContributionsBar data={monthlyContributions} />
          </div>

          <FeeDragArea data={feeDragChart} />
        </div>
      </div>
    </div>
  );
}
