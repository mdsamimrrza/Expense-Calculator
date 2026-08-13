import type { Metadata } from "next";
import { getEntries } from "@/lib/actions/entries";
import { getFundConfigs } from "@/lib/actions/fund-config";
import { EntryTable } from "@/components/entries/entry-table";
import { EntryForm } from "@/components/entries/entry-form";
import { CsvImportDialog } from "@/components/entries/csv-import-dialog";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "SIP History",
};

interface HistoryPageProps {
  searchParams: Promise<{
    fund?: string;
  }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const selectedFundId = params.fund || "all";

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

      {/* History Table (Now includes Fund Filter & Search Bar) */}
      <EntryTable entries={entries} funds={funds} total={total} selectedFundId={selectedFundId} />
    </div>
  );
}
