import type { Metadata } from "next";
import { getEntries } from "@/lib/actions/entries";
import { getFundConfigs } from "@/lib/actions/fund-config";
import { EntryTable } from "@/components/entries/entry-table";
import { EntryForm } from "@/components/entries/entry-form";
import { CsvImportDialog } from "@/components/entries/csv-import-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "SIP History",
};

interface HistoryPageProps {
  searchParams: {
    fund?: string;
  };
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const selectedFundId = searchParams.fund || "all";

  const [fundsRes, entriesRes] = await Promise.all([
    getFundConfigs(),
    getEntries({
      fundId: selectedFundId !== "all" ? selectedFundId : undefined,
      pageSize: 500, // Fetch full history for client table sorting
    }),
  ]);

  if (!fundsRes.success || !fundsRes.data || fundsRes.data.length === 0) {
    redirect("/onboarding");
  }

  const funds = fundsRes.data;
  const entries = entriesRes.data?.entries || [];
  const total = entriesRes.data?.total || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SIP History</h1>
          <p className="text-sm text-muted-foreground">
            View, edit, or import your past monthly purchase records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CsvImportDialog funds={funds} selectedFundId={selectedFundId !== "all" ? selectedFundId : undefined} />
          <EntryForm funds={funds} defaultFundId={selectedFundId !== "all" ? selectedFundId : undefined} />
        </div>
      </div>

      {/* Multi-fund Filter Tabs */}
      {funds.length > 1 && (
        <div className="p-1 rounded-xl border border-border/50 bg-card/50 w-fit">
          <Tabs defaultValue={selectedFundId}>
            <TabsList>
              <TabsTrigger value="all" asChild>
                <Link href="/history?fund=all">All Funds</Link>
              </TabsTrigger>
              {funds.map((fund) => (
                <TabsTrigger key={fund.id} value={fund.id} asChild>
                  <Link href={`/history?fund=${fund.id}`}>{fund.fund_name}</Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* History Table */}
      <EntryTable entries={entries} funds={funds} total={total} />
    </div>
  );
}
