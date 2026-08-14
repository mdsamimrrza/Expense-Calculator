import type { Metadata } from "next";
import { getDashboardData } from "@/lib/actions/dashboard";
import { redirect } from "next/navigation";
import type { FundConfig } from "@/lib/types";
import { TaxBreakdownView } from "@/components/tax/tax-breakdown-view";

export const metadata: Metadata = {
  title: "Tax & Settlement Ledger",
};

interface TaxBreakdownPageProps {
  searchParams: Promise<{
    fund?: string;
  }>;
}

export default async function TaxBreakdownPage({ searchParams }: TaxBreakdownPageProps) {
  const params = await searchParams;
  const selectedFundId = params.fund || "all";
  const result = await getDashboardData(selectedFundId);

  if ("redirect" in result && typeof result.redirect === "string") {
    redirect(result.redirect);
  }

  if (!result.success || !result.data) {
    redirect("/onboarding");
  }

  const { summary, funds, entries, feeDragChart } = result.data;
  const activeFund = funds.find((f: FundConfig) => f.id === selectedFundId) || funds[0];

  return (
    <TaxBreakdownView
      summary={summary}
      funds={funds}
      entriesCount={entries.length}
      selectedFundId={selectedFundId}
      activeFund={activeFund}
      feeDragChart={feeDragChart}
    />
  );
}
