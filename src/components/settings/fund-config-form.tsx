"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createFundConfig, updateFundConfig, deleteFundConfig } from "@/lib/actions/fund-config";
import { FUND_PRESETS, MIN_SIP_AMOUNT } from "@/lib/constants";
import type { FundConfig } from "@/lib/types";
import { formatCurrencyWhole, formatDate } from "@/lib/format";

interface FundConfigFormProps {
  funds: FundConfig[];
}

export function FundConfigForm({ funds }: FundConfigFormProps) {
  const [open, setOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<FundConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [fundName, setFundName] = useState("");
  const [feeRate, setFeeRate] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [monthlySip, setMonthlySip] = useState("");
  const [latestNav, setLatestNav] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // Pagination & Search filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const filteredFunds = funds.filter((f) =>
    f.fund_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredFunds.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedFunds = filteredFunds.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const router = useRouter();
  const { toast } = useToast();

  function openEdit(fund: FundConfig) {
    setEditingFund(fund);
    setFundName(fund.fund_name);
    setFeeRate(fund.fee_rate_pct.toString());
    setStartDate(fund.start_date);
    setMonthlySip(fund.monthly_sip.toString());
    setLatestNav(fund.latest_nav ? fund.latest_nav.toString() : "");
    // If fund matches a preset, pre-select it
    const preset = FUND_PRESETS.find((p) => p.name === fund.fund_name);
    setSelectedPreset(preset ? preset.name : "custom");
    setOpen(true);
  }

  function openCreate() {
    setEditingFund(null);
    setFundName("");
    setFeeRate("1.80");
    setStartDate(new Date().toISOString().split("T")[0]);
    setMonthlySip("5000");
    setLatestNav("10.00");
    setSelectedPreset("");
    setOpen(true);
  }

  function handlePresetChange(value: string) {
    setSelectedPreset(value);
    if (!value || value === "custom") return;
    const preset = FUND_PRESETS.find((p) => p.name === value);
    if (preset) {
      setFundName(preset.name);
      setFeeRate(preset.feeRate.toString());
      // Do not override monthly SIP or latest NAV — user may want custom values
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.set("fund_name", fundName);
    formData.set("fee_rate_pct", feeRate);
    formData.set("start_date", startDate);
    formData.set("monthly_sip", monthlySip);
    if (latestNav && parseFloat(latestNav) > 0) {
      formData.set("latest_nav", latestNav);
    }

    const result = editingFund
      ? await updateFundConfig(editingFund.id, formData)
      : await createFundConfig(formData);

    if (result.success) {
      toast({
        title: editingFund ? "Fund updated" : "Fund added",
        description: `${fundName} settings saved successfully.`,
      });
      setOpen(false);
      router.refresh();
    } else {
      toast({
        title: "Action failed",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  }

  async function handleDelete(id: string) {
    setIsLoading(true);
    const result = await deleteFundConfig(id);

    if (result.success) {
      toast({
        title: "Fund removed",
        description: "Fund configuration deleted.",
      });
      setDeletingId(null);
      router.refresh();
    } else {
      toast({
        title: "Deletion blocked",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  }

  return (
    <div className="space-y-3">
      {/* Toolbar: count + search + add */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground tabular-nums">{funds.length}</strong>{" "}
          {funds.length === 1 ? "fund" : "funds"} tracked
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {funds.length > 3 && (
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search funds..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-full pl-9 text-sm sm:h-9"
              />
            </div>
          )}
          <Button
            size="sm"
            onClick={openCreate}
            className="h-10 w-full rounded-full text-sm sm:h-9 sm:w-auto"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Fund
          </Button>
        </div>
      </div>

      {/* Fund list */}
      {funds.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">No funds yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first mutual fund to start tracking your SIP.
            </p>
          </div>
          <Button size="sm" onClick={openCreate} className="rounded-full">
            <Plus className="mr-1.5 h-4 w-4" />
            Add your first fund
          </Button>
        </div>
      ) : paginatedFunds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No funds match "{searchQuery}".
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginatedFunds.map((fund) => (
            <div
              key={fund.id}
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-violet-500/15 text-violet-600 dark:text-violet-400">
                    <Building2 className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <h4 className="truncate text-sm font-semibold text-foreground">
                    {fund.fund_name}
                  </h4>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full sm:h-8 sm:w-8"
                    aria-label={`Edit ${fund.fund_name}`}
                    onClick={() => openEdit(fund)}
                  >
                    <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-destructive hover:text-destructive sm:h-8 sm:w-8"
                    aria-label={`Delete ${fund.fund_name}`}
                    onClick={() => setDeletingId(fund.id)}
                  >
                    <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Stat grid */}
              <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border/60 sm:grid-cols-4">
                <div className="bg-secondary/30 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Annual Fee
                  </p>
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {fund.fee_rate_pct}%
                  </p>
                </div>
                <div className="bg-secondary/30 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Monthly SIP
                  </p>
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {formatCurrencyWhole(Number(fund.monthly_sip))}
                  </p>
                </div>
                <div className="bg-secondary/30 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Latest NAV
                  </p>
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {fund.latest_nav ? `NPR ${fund.latest_nav}` : "N/A"}
                  </p>
                </div>
                <div className="bg-secondary/30 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Started
                  </p>
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {formatDate(fund.start_date)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredFunds.length > ITEMS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs">
          <span className="text-muted-foreground">
            Showing <strong>{startIndex + 1}</strong>–
            <strong>{Math.min(startIndex + ITEMS_PER_PAGE, filteredFunds.length)}</strong> of{" "}
            <strong>{filteredFunds.length}</strong> funds
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              disabled={validCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`h-8 w-8 rounded-full font-medium text-xs transition-colors ${
                  validCurrentPage === pageNum
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {pageNum}
              </button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingFund ? "Edit Fund" : "Add Fund"}</DialogTitle>
            <DialogDescription>
              Configure annual fee %, planned monthly investment, and current market NAV.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="preset-select">Preset Fund</Label>
              <Select onValueChange={handlePresetChange} value={selectedPreset}>
                <SelectTrigger id="preset-select">
                  <SelectValue placeholder="Choose a preset or select Custom" />
                </SelectTrigger>
                <SelectContent>
                  {FUND_PRESETS.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom / Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fund-name-input">Fund Name</Label>
                <Input
                  id="fund-name-input"
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                  placeholder="e.g. NMB Saral Bachat Fund-E"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fee-rate-input">Annual Fee (%)</Label>
                <Input
                  id="fee-rate-input"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={feeRate}
                  onChange={(e) => setFeeRate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="latest-nav-input">Current NAV (NPR)</Label>
                <Input
                  id="latest-nav-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={latestNav}
                  onChange={(e) => setLatestNav(e.target.value)}
                  placeholder="e.g. 10.50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sip-amount-input">Monthly SIP (NPR)</Label>
                <Input
                  id="sip-amount-input"
                  type="number"
                  min={String(MIN_SIP_AMOUNT)}
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum NPR {MIN_SIP_AMOUNT.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date-input">Start Date</Label>
                <Input
                  id="start-date-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingFund ? "Save Changes" : "Add Fund"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Fund Configuration</DialogTitle>
            <DialogDescription>
              Are you sure? A fund with existing SIP entries cannot be deleted until
              all its entries are removed first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Fund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
