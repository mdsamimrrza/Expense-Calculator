"use client";

import { useEffect, useState, useRef } from "react";
import { CalendarClock, Check, AlertTriangle, TrendingUp, Target, Sparkles, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getUpcomingInstallments } from "@/lib/actions/upcoming";
import type { UpcomingInstallment } from "@/lib/types";
import { formatCurrencyWhole, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAILY_POPUP_KEY = "sahakari-daily-popup";

function getLastShown(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(DAILY_POPUP_KEY);
  } catch {
    return null;
  }
}

function setLastShown(date: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DAILY_POPUP_KEY, date);
  } catch {}
}

function shouldShowToday(): boolean {
  const today = new Date().toISOString().split("T")[0];
  return getLastShown() !== today;
}

function groupInstallments(items: UpcomingInstallment[]) {
  const today: UpcomingInstallment[] = [];
  const tomorrow: UpcomingInstallment[] = [];
  const thisWeek: UpcomingInstallment[] = [];
  const later: UpcomingInstallment[] = [];

  for (const u of items) {
    if (u.daysRemaining === 0) today.push(u);
    else if (u.daysRemaining === 1) tomorrow.push(u);
    else if (u.daysRemaining <= 7) thisWeek.push(u);
    else later.push(u);
  }
  return { today, tomorrow, thisWeek, later };
}

function StatPill({ icon, label, value, color, currency = false }: { icon: React.ReactNode; label: string; value: number; color: string; currency?: boolean }) {
  const display = currency ? formatCurrencyWhole(value) : value;
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 ${color}`}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[11px]">{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="truncate text-sm font-bold tabular-nums text-foreground">{display}</span>
      </div>
    </div>
  );
}

function InstallmentCard({ u, index }: { u: UpcomingInstallment; index: number }) {
  const isDueToday = u.daysRemaining === 0;
  const isDueTomorrow = u.daysRemaining === 1;

  // Theme-aware colors
  const accentBg = isDueToday
    ? "bg-red-500/10 dark:bg-red-500/20"
    : isDueTomorrow
      ? "bg-amber-500/10 dark:bg-amber-500/20"
      : "bg-emerald-500/10 dark:bg-emerald-500/20";
  const accentBorder = isDueToday
    ? "border-red-500/20 dark:border-red-500/30"
    : isDueTomorrow
      ? "border-amber-500/20 dark:border-amber-500/30"
      : "border-emerald-500/20 dark:border-emerald-500/30";
  const accentText = isDueToday
    ? "text-red-600 dark:text-red-400"
    : isDueTomorrow
      ? "text-amber-600 dark:text-amber-400"
      : "text-emerald-600 dark:text-emerald-400";
  const leftBar = isDueToday
    ? "bg-red-500"
    : isDueTomorrow
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <li
      key={u.fundId}
      style={{ animationDelay: `${index * 50}ms` }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40"
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${leftBar}`} />

      <div className="flex items-center gap-3 p-3 sm:p-4">
        {/* Fund avatar */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 sm:h-11 sm:w-11">
          <CalendarClock className="h-5 w-5" />
          {isDueToday && (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
              !
            </span>
          )}
        </div>

        {/* Fund info */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{u.fundName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              <span>{formatDate(u.nextDue)}</span>
            </span>
            {u.nextDueBS && (
              <>
                <span className="text-foreground/30">·</span>
                <span className="font-medium text-primary-600 dark:text-primary-400">{u.nextDueBS} BS</span>
              </>
            )}
            <span className="text-foreground/30">·</span>
            <span className="font-bold tabular-nums text-foreground">{formatCurrencyWhole(u.amount)}</span>
          </div>
        </div>

        {/* Status chip */}
        <div className="flex items-center gap-2">
          <span className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${accentBg} ${accentBorder} ${accentText}`}>
            {isDueToday && <AlertTriangle className="h-3 w-3" />}
            <span>
              {isDueToday
                ? "Due today"
                : isDueTomorrow
                  ? "Due tomorrow"
                  : `${u.daysRemaining}d`}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
        </div>
      </div>

      {/* Subtle divider */}
      <div className="absolute bottom-0 left-12 right-4 h-px bg-border/50" />
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="relative mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-primary/10 dark:from-violet-500/20 dark:to-primary/20 border border-violet-500/20 dark:border-violet-500/30">
          <Sparkles className="h-8 w-8 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-card border-2 border-primary/20 dark:border-primary/30">
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
      <p className="text-base font-semibold text-foreground">All caught up</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        No upcoming installments. Add a fund in Settings to start tracking your SIP journey.
      </p>
    </div>
  );
}

function SectionHeader({ title, icon, color, count }: { title: string; icon: React.ReactNode; color: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-1 pb-2 pt-1">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${color}`}>{icon}</span>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{title}</h4>
      </div>
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-1.5 text-[10px] font-bold text-primary dark:bg-primary/20">
        {count}
      </span>
    </div>
  );
}

/**
 * Professional daily installments popup — appears once per day.
 * Works in both light and dark modes with proper contrast.
 */
export function DailyInstallmentsPopup() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UpcomingInstallment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldShowToday()) {
      const timer = setTimeout(() => setOpen(true), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  async function loadItems() {
    setLoading(true);
    setItems(await getUpcomingInstallments());
    setLoading(false);
  }

  useEffect(() => {
    if (open) loadItems();
  }, [open]);

  function handleClose() {
    if (dontShowAgain) {
      setLastShown(new Date().toISOString().split("T")[0]);
    }
    setOpen(false);
  }

  if (!open) return null;

  const { today, tomorrow, thisWeek, later } = groupInstallments(items);
  const hasItems = items.length > 0;
  const totalAmount = items.reduce((sum, u) => sum + u.amount, 0);
  const dueSoon = today.length + tomorrow.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        ref={contentRef}
        className="w-[calc(100%-1rem)] max-w-2xl gap-0 overflow-hidden rounded-[1.75rem] border-border bg-background p-0 shadow-2xl max-h-[min(90vh,760px)]"
      >
        <div className="border-b border-border bg-card px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                  Upcoming SIP Installments
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  Based on your registered schedules <span aria-hidden>·</span> {items.length} fund{items.length !== 1 ? "s" : ""} tracked
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 min-w-0">
            <StatPill
              icon={<Target className="h-3.5 w-3.5" />}
              label="Due Soon"
              value={dueSoon}
              color="border-red-500/30 dark:border-red-500/40 text-red-600 dark:text-red-400"
            />
            <StatPill
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="This Week"
              value={thisWeek.length}
              color="border-amber-500/30 dark:border-amber-500/40 text-amber-600 dark:text-amber-400"
            />
            <StatPill
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              label="Total"
              value={totalAmount}
              currency
              color="border-emerald-500/30 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-background px-4 py-4 sm:px-6 sm:py-5">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground">
              <svg className="h-7 w-7 animate-spin text-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : hasItems ? (
            <div className="space-y-5">
              {today.length > 0 && (
                <>
                  <SectionHeader
                    title="Due Today"
                    icon={<AlertTriangle className="h-3.5 w-3.5" />}
                    color="border-red-500/30 text-red-600 dark:border-red-500/40 dark:text-red-400"
                    count={today.length}
                  />
                  <ul className="space-y-2">{today.map((u, i) => <InstallmentCard key={u.fundId} u={u} index={i} />)}</ul>
                </>
              )}
              {tomorrow.length > 0 && (
                <>
                  <SectionHeader
                    title="Due Tomorrow"
                    icon={<CalendarClock className="h-3.5 w-3.5" />}
                    color="border-amber-500/30 text-amber-600 dark:border-amber-500/40 dark:text-amber-400"
                    count={tomorrow.length}
                  />
                  <ul className="space-y-2">{tomorrow.map((u, i) => <InstallmentCard key={u.fundId} u={u} index={i} />)}</ul>
                </>
              )}
              {thisWeek.length > 0 && (
                <>
                  <SectionHeader
                    title="This Week"
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    color="border-emerald-500/30 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-400"
                    count={thisWeek.length}
                  />
                  <ul className="space-y-2">{thisWeek.map((u, i) => <InstallmentCard key={u.fundId} u={u} index={i} />)}</ul>
                </>
              )}
              {later.length > 0 && (
                <>
                  <SectionHeader
                    title="Later"
                    icon={<CalendarClock className="h-3.5 w-3.5" />}
                    color="border-blue-500/30 text-blue-600 dark:border-blue-500/40 dark:text-blue-400"
                    count={later.length}
                  />
                  <ul className="space-y-2">{later.map((u, i) => <InstallmentCard key={u.fundId} u={u} index={i} />)}</ul>
                </>
              )}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>

        <div className="border-t border-border bg-card px-4 py-3.5 sm:px-6">
          <label className="flex cursor-pointer select-none items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-5 w-5 shrink-0">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="absolute inset-0 h-5 w-5 appearance-none rounded-md border border-border bg-background checked:border-primary checked:bg-primary focus:ring-2 focus:ring-primary/30"
                />
                {dontShowAgain && <Check className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 text-primary-foreground" />}
              </div>
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">Don't show again today</span>
                <span className="block truncate text-[11px] text-muted-foreground">Reappears tomorrow with a fresh schedule</span>
              </div>
            </div>
            <Check className={cn("h-5 w-5 shrink-0 rounded-full p-1 transition-colors", dontShowAgain ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")} />
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}