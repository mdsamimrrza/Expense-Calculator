"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { FUND_PRESETS } from "@/lib/constants";
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
        title: editingFund ? "Fund updated" : "Fund added 🎉",
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
    <Card className="border-border/60 rounded-[2rem] shadow-sm bg-card overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 pt-6 pb-4">
        <div>
          <CardTitle className="text-lg font-extrabold">Fund Configurations</CardTitle>
          <CardDescription className="text-xs mt-1 font-medium">
            Manage your tracked mutual funds, fee percentages, and planned monthly SIP amounts.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate} className="rounded-xl font-bold h-9 shrink-0">
          <Plus className="mr-1.5 h-4 w-4 stroke-[3]" />
          Add Fund
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 px-6 pb-6 pt-2">
        {/* Search Bar for 4+ Funds */}
        {funds.length > 3 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search funds by name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs rounded-xl bg-secondary/30 border-border/50"
            />
          </div>
        )}

        {paginatedFunds.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground bg-secondary/20 rounded-2xl border border-border/40">
            No funds match your search query.
          </div>
        ) : (
          paginatedFunds.map((fund) => (
            <div
              key={fund.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-[1.5rem] border border-border/50 bg-secondary/30 hover:bg-secondary/60 transition-colors gap-3 sm:gap-0"
            >
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">{fund.fund_name}</h4>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Fee: <strong className="text-foreground">{fund.fee_rate_pct}%</strong> | Planned SIP:{" "}
                  <strong className="text-foreground">{formatCurrencyWhole(Number(fund.monthly_sip))}</strong>
                  {fund.latest_nav ? (
                    <>
                      {" "}
                      | NAV: <strong className="text-emerald-600 dark:text-emerald-400">NPR {fund.latest_nav}</strong>
                    </>
                  ) : null}{" "}
                  | Started: {formatDate(fund.start_date)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 hover:bg-background shadow-sm border border-border/30" onClick={() => openEdit(fund)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white shadow-sm border border-rose-500/20 transition-colors"
                  onClick={() => setDeletingId(fund.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}

        {/* Pagination Controls */}
        {filteredFunds.length > ITEMS_PER_PAGE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs">
            <span className="text-muted-foreground font-medium">
              Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + ITEMS_PER_PAGE, filteredFunds.length)}</strong> of <strong>{filteredFunds.length}</strong> funds
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={validCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 rounded-xl font-bold text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Prev
              </Button>
              <span className="font-extrabold px-2 text-foreground text-xs">
                Page {validCurrentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 rounded-xl font-bold text-xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingFund ? "Edit Fund" : "Add Fund Config"}</DialogTitle>
              <DialogDescription>
                Configure annual fee %, planned monthly investment, and current market NAV.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="preset-select">Preset Fund</Label>
                <Select
                  onValueChange={handlePresetChange}
                  value={selectedPreset}
                >
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
              <div className="space-y-2">
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
                <Label htmlFor="sip-amount-input">Planned Monthly SIP (NPR)</Label>
                <Input
                  id="sip-amount-input"
                  type="number"
                  min="100"
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(e.target.value)}
                  required
                />
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

              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
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
                Are you sure? Note: A fund with existing SIP entries cannot be deleted until all entries are deleted first.
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
      </CardContent>
    </Card>
  );
}
