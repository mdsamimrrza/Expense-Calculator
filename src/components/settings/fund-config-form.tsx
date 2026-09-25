"use client";

import { Fragment, useEffect, useState } from "react";
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
  Check,
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
import { FUND_PRESETS } from "@/lib/constants";
import { getFundMeta } from "@/lib/fund-meta";
import { computeSchedule, nepalTodayAD, formatBSDate, upcomingDueDates } from "@/lib/calendar/bs";
import { resolveSchedule } from "@/lib/sip-schedule";
import {
  SIPScheduleFields,
  scheduleToFormFields,
  EMPTY_SCHEDULE,
  FREQUENCY_LABELS,
  type SIPScheduleValue,
} from "@/components/settings/sip-schedule-fields";
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
  const [schedule, setSchedule] = useState<SIPScheduleValue>(EMPTY_SCHEDULE);
  // True once the user deliberately edits the SIP start date; until then it
  // mirrors the registration date.
  const [anchorEdited, setAnchorEdited] = useState(false);

  // Keep the SIP start date in sync with the registration date unless the
  // user has explicitly customized it.
  useEffect(() => {
    if (!anchorEdited) {
      setSchedule((s) => (s.anchorDate === startDate ? s : { ...s, anchorDate: startDate, verified: false }));
    }
  }, [startDate, anchorEdited]);
  // Dialog section stepper - one stage at a time on every screen.
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const SECTIONS = ["Fund", "SIP Schedule", "Current NAV"] as const;

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
    // The SIP start date defaults to the registration date; only treat it
    // as user-customized when a saved anchor differs from the start date.
    setAnchorEdited(Boolean(fund.anchor_date && fund.anchor_date !== fund.start_date));
    setSchedule({
      frequency: fund.frequency,
      anchorDate: fund.anchor_date ?? fund.start_date,
      verified: fund.schedule_verified,
    });
    // If fund matches a preset, pre-select it
    const preset = FUND_PRESETS.find((p) => p.name === fund.fund_name);
    setSelectedPreset(preset ? preset.name : "custom");
    setStep(0);
    setMaxReached(0);
    setOpen(true);
  }

  function openCreate() {
    const today = new Date().toISOString().split("T")[0];
    setEditingFund(null);
    setFundName("");
    setFeeRate("1.80");
    setStartDate(today);
    setMonthlySip("5000");
    setLatestNav("10.00");
    setSelectedPreset("");
    setAnchorEdited(false);
    setSchedule({ ...EMPTY_SCHEDULE, anchorDate: today });
    setStep(0);
    setMaxReached(0);
    setOpen(true);
  }

  function handlePresetChange(value: string) {
    setSelectedPreset(value);
    if (!value || value === "custom") return;
    const preset = FUND_PRESETS.find((p) => p.name === value);
    if (preset) {
      setFundName(preset.name);
      setFeeRate(preset.feeRate.toString());
      // Do not override monthly SIP or latest NAV - user may want custom values
    }
  }

  /** Validate the visible step. Returns an error message, or null when OK. */
  function validateStep(s: number): string | null {
    if (s === 0) {
      if (fundName.trim().length === 0) return "Enter the fund name first.";
      if (!(parseFloat(feeRate) > 0)) return "Enter a valid annual fee.";
      if (!startDate) return "Pick the SIP registration date.";
      return null;
    }
    if (s === 1) {
      const minSip = getFundMeta(fundName)?.minimumSipAmount ?? 1000;
      if (!(parseFloat(monthlySip) >= minSip)) {
        return `SIP installment must be at least NPR ${minSip.toLocaleString("en-IN")}.`;
      }
      // The start date is always populated (mirrors registration), so the
      // only way the schedule is "partial" is a chosen interval with no date.
      const { frequency, anchorDate } = schedule;
      if (frequency && !anchorDate) {
        return "Finish the registered schedule (interval and start date) or clear it.";
      }
      return null;
    }
    return null;
  }

  function handleNext() {
    const err = validateStep(step);
    if (err) {
      toast({ title: "Incomplete step", description: err, variant: "destructive" });
      return;
    }
    const next = Math.min(step + 1, SECTIONS.length - 1);
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
  }

  function goToStep(i: number) {
    // Only revisit reached steps - forward movement goes through Next
    // so partial data can never be skipped over.
    if (i <= maxReached) setStep(i);
  }

  /** The ONLY save path - called solely by the step-3 button's onClick.
      The form itself never submits (see onSubmit below), so no Enter key,
      implicit submission, or stray click can ever trigger a save. */
  async function submitAll() {
    setIsLoading(true);
    try {
      const formData = new FormData();
    formData.set("fund_name", fundName);
    formData.set("fee_rate_pct", feeRate);
    formData.set("start_date", startDate);
    formData.set("monthly_sip", monthlySip);
    for (const [key, val] of Object.entries(scheduleToFormFields(schedule))) {
      formData.set(key, val);
    }
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
    } catch {
      toast({
        title: "Action failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  /** Step-3 Save button handler: re-validates every step (jumping back to
      the offending one) and only then submits. */
  async function handleSaveClick() {
    for (const s of [0, 1]) {
      const err = validateStep(s);
      if (err) {
        toast({ title: "Incomplete details", description: err, variant: "destructive" });
        setStep(s);
        return;
      }
    }
    if (!(parseFloat(latestNav) > 0)) {
      toast({
        title: "Incomplete details",
        description: "Enter a valid current NAV.",
        variant: "destructive",
      });
      return;
    }
    await submitAll();
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
          {paginatedFunds.map((fund) => {
              const { sip, source } = resolveSchedule(fund);
              const sched = computeSchedule(sip, nepalTodayAD());
              return (
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
                    {FREQUENCY_LABELS[sip.frequency]} SIP
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

              {/* Next due - derived by the central engine from the effective
                  schedule (confirmed registration, else the start date). */}
              <p className="mt-2 text-xs text-muted-foreground">
                {FREQUENCY_LABELS[sip.frequency]} · Next due{" "}
                <span className="font-semibold text-foreground">
                  {formatDate(sched.nextDue)}
                </span>
                {sip.calendarSystem === "BS" && (
                  <>{" · " + formatBSDate(sched.nextDue) + " BS"}</>
                )}
                {source === "registration" && (
                  <span className="text-amber-500">
                    {" "}· from your start date. Confirm the exact schedule to edit
                  </span>
                )}
              </p>
            </div>
              );
            })}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredFunds.length > ITEMS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs">
          <span className="text-muted-foreground">
            Showing <strong>{startIndex + 1}</strong>-
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

      {/* Add/Edit Modal - 3 sections: stepped on mobile, bordered on desktop */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] gap-3 overflow-y-auto p-4 sm:max-w-[720px] sm:p-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-center text-base font-extrabold uppercase tracking-wide">
              {editingFund ? "Edit Fund" : "Add Fund"}
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Enter your actual fund registration details. You can change them later
              any time from Settings → My Funds.
            </DialogDescription>
          </DialogHeader>

          {/* Numbered progress stepper - one stage at a time on all screens */}
          <div className="flex items-start">
            {SECTIONS.map((title, i) => (
              <Fragment key={title}>
                {i > 0 && (
                  <div className={`mt-3.5 h-0.5 flex-1 rounded ${i <= step ? "bg-primary" : "bg-border"}`} />
                )}
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  className="flex w-16 shrink-0 flex-col items-center gap-1"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      i < step
                        ? "bg-primary text-primary-foreground"
                        : i === step
                          ? "border-2 border-primary bg-background text-primary"
                          : "border border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span
                    className={`text-[10px] leading-tight ${
                      i === step ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {title}
                  </span>
                </button>
              </Fragment>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              // Belt-and-suspenders: this form NEVER submits by itself.
              // Saving happens only via the step-3 button's onClick.
              e.preventDefault();
            }}
            className="space-y-3 pt-1 sm:pt-0"
          >
            {/* Section 1 - Fund details */}
            <section className={step === 0 ? "space-y-3" : "hidden"}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1 · Fund details
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="preset-select">Preset Fund</Label>
                <Select onValueChange={handlePresetChange} value={selectedPreset}>
                  <SelectTrigger id="preset-select" className="h-9">
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
              <div className="space-y-1.5">
                <Label htmlFor="fund-name-input">Fund Name</Label>
                <Input
                  id="fund-name-input"
                  className="h-9"
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                  placeholder="e.g. NMB Saral Bachat Fund-E"
                />
              </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fee-rate-input">Annual Fee (%)</Label>
                  <Input
                    id="fee-rate-input"
                    className="h-9"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={feeRate}
                    onChange={(e) => setFeeRate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="start-date-input">SIP Registration Date</Label>
                  <Input
                    id="start-date-input"
                    className="h-9"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    From your SIP registration form. Until a schedule is confirmed
                    below, installments repeat this date on the BS calendar each
                    month (bank-confirmed rule).
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2 - SIP schedule */}
            <section className={step === 1 ? "space-y-3" : "hidden"}>
              <div>
                <p className="text-sm font-semibold text-foreground">SIP Schedule</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Enter the details exactly as printed on your SIP registration form.
                  Unlimited SIP only. No maturity date or installment count.
                </p>
              </div>

              {/* Installment amount with inline minimum chip */}
              <div className="space-y-1.5">
                <Label htmlFor="sip-amount-input" className="text-xs">
                  SIP Installment (NPR)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="sip-amount-input"
                    className="h-9 flex-1"
                    type="number"
                    min={String(getFundMeta(fundName)?.minimumSipAmount ?? 0)}
                    value={monthlySip}
                    onChange={(e) => setMonthlySip(e.target.value)}
                  />
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                    {getFundMeta(fundName)
                      ? `Min ${formatCurrencyWhole(getFundMeta(fundName)!.minimumSipAmount)}`
                      : "Min set by fund"}
                  </span>
                </div>
              </div>

              <SIPScheduleFields
                fundName={fundName}
                value={schedule}
                onChange={setSchedule}
                startDateLocked={!anchorEdited}
                onEditStartDate={() => setAnchorEdited(true)}
              />
              <DraftInstallmentsPreview
                frequency={schedule.frequency}
                anchorDate={schedule.anchorDate}
              />
            </section>

            {/* Section 3 - Current NAV */}
            <section className={step === 2 ? "space-y-3" : "hidden"}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                3 · Current NAV
              </p>
              <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="latest-nav-input">Current NAV (NPR)</Label>
                  <Input
                    id="latest-nav-input"
                    className="h-9"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={latestNav}
                    onChange={(e) => setLatestNav(e.target.value)}
                    placeholder="e.g. 10.50"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Today's market NAV, used to value your units. Update it any time from
                  the dashboard.
                </p>
              </div>
            </section>

            <DialogFooter className="gap-2 sm:gap-0">
              {/* Step navigation - all screens */}
              <div className="flex w-full items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                {step < SECTIONS.length - 1 ? (
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleNext}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSaveClick}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingFund ? "Save Changes" : "Add Fund"}
                  </Button>
                )}
              </div>
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

/** Live preview of the next installments from the DRAFT schedule fields, so
    the user verifies due dates before confirming. Rendered only once
    frequency + calendar + anchor are all chosen; conversion failures
    (e.g. out-of-range BS dates) simply hide the preview. */
function DraftInstallmentsPreview({
  frequency,
  anchorDate,
}: {
  frequency: SIPScheduleValue["frequency"];
  anchorDate: SIPScheduleValue["anchorDate"];
}) {
  if (!frequency || !anchorDate) return null;
  let dates: string[] = [];
  try {
    // Preview the schedule itself from the registered first due date
    // (#1 = anchor), so the user verifies the actual registration.
    // Recurrence is always BS (the fund-side rule); the user just gave AD.
    dates = upcomingDueDates(
      { frequency, calendarSystem: "BS", anchorDate },
      nepalTodayAD(),
      3,
      true
    );
  } catch {
    return null;
  }
  if (dates.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Upcoming installments
      </p>
      {/* Horizontal timeline: node - line - node - line - node */}
      <div className="mt-3 flex items-start">
        {dates.map((d, i) => {
          const segments = [];
          if (i > 0) {
            segments.push(<span key="line" className="mt-3 h-px flex-1 bg-border" aria-hidden />);
          }
          segments.push(
            <div key="node" className="flex w-[104px] shrink-0 flex-col items-center text-center sm:w-28">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-secondary text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <p className="mt-1.5 text-[11px] font-semibold leading-tight tabular-nums text-foreground">
                {formatDate(d)}
              </p>
              <p className="text-[10px] leading-tight tabular-nums text-muted-foreground">
                {formatBSDate(d)} BS
              </p>
              {i === 0 && (
                <span className="mt-1 rounded-full bg-primary/10 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-primary">
                  Next
                </span>
              )}
            </div>
          );
          return segments;
        })}
      </div>
    </div>
  );
}
