"use client";

// ============================================================
// Registered SIP schedule fields - mirrors the official SIP
// registration form: the user enters the AD dates exactly as
// printed on their registration. The BS-calendar recurrence the
// fund manager performs in its backend is replicated here in the
// schedule engine - the user is never asked about calendars.
// Frequency options come from fund metadata (src/lib/fund-meta.ts).
// ============================================================

import { CalendarRange, Info, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBSDate, type SIPFrequency } from "@/lib/calendar/bs";
import { getFundMeta } from "@/lib/fund-meta";

export const FREQUENCY_LABELS: Record<SIPFrequency, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUALLY: "Semi-annual",
  ANNUALLY: "Annual",
};

export interface SIPScheduleValue {
  frequency: SIPFrequency | null;
  /** Registered first due date, AD "YYYY-MM-DD" (as on the form). */
  anchorDate: string | null;
  verified: boolean;
}

export const EMPTY_SCHEDULE: SIPScheduleValue = {
  frequency: null,
  anchorDate: null,
  verified: false,
};

/**
 * Flat FormData fields for the schedule. Recurrence is always BS - the
 * bank/fund-manager rule confirmed 2026-09-24 - so calendar_system is
 * fixed, never user-entered.
 */
export function scheduleToFormFields(value: SIPScheduleValue): Record<string, string> {
  return {
    frequency: value.frequency ?? "",
    calendar_system: value.frequency && value.anchorDate ? "BS" : "",
    anchor_date: value.anchorDate ?? "",
    schedule_verified: String(value.verified),
  };
}

interface Props {
  fundName: string;
  value: SIPScheduleValue;
  onChange: (next: SIPScheduleValue) => void;
  /**
   * When true, the start date mirrors the registration date and the field
   * renders as a locked preview; the first edit unlocks it (onEditStartDate).
   */
  startDateLocked?: boolean;
  onEditStartDate?: () => void;
}

export function SIPScheduleFields({
  fundName,
  value,
  onChange,
  startDateLocked = false,
  onEditStartDate,
}: Props) {
  const meta = getFundMeta(fundName);

  if (!meta) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-amber-500">Unverified fund.</span>{" "}
          SahakariSIP has no official configuration for "{fundName || "this fund"}", so
          an exact schedule cannot be confirmed here. Installments follow your SIP
          registration date monthly until the fund is verified. The app never invents
          any other date.
        </p>
      </div>
    );
  }

  const set = (patch: Partial<SIPScheduleValue>) => onChange({ ...value, ...patch });
  const complete = Boolean(value.frequency && value.anchorDate);

  return (
    <div className="space-y-3">
      {/* Interval + start date, side by side */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <Label className="text-xs">SIP Interval</Label>
          <Select
            value={value.frequency ?? ""}
            onValueChange={(v) => set({ frequency: v as SIPFrequency, verified: false })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {meta.supportedFrequencies.map((f) => (
                <SelectItem key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">SIP Start Date</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              className="h-9 flex-1"
              value={value.anchorDate ?? ""}
              readOnly={startDateLocked}
              onChange={(e) => {
                onEditStartDate?.();
                set({ anchorDate: e.target.value || null, verified: false });
              }}
              onClick={startDateLocked ? () => onEditStartDate?.() : undefined}
            />
            {startDateLocked && (
              <button
                type="button"
                onClick={() => onEditStartDate?.()}
                className="shrink-0 text-[10px] font-semibold text-primary underline-offset-2 hover:underline"
              >
                Change
              </button>
            )}
          </div>
          {startDateLocked && (
            <p className="text-[10px] text-muted-foreground">Same as your registration date</p>
          )}
        </div>
      </div>

      {/* The fund-side BS rule, surfaced as a quiet note */}
      {value.anchorDate && (
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 px-2.5 py-2">
          <CalendarRange className="mt-px h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Every installment repeats{" "}
            <span className="font-semibold text-foreground">{formatBSDate(value.anchorDate)} BS</span>
            . This is the same date rule the fund applies on its side.
          </p>
        </div>
      )}

      {/* Confirm checkbox - becomes a highlighted card when checked */}
      <label
        className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
          value.verified
            ? "border-primary/40 bg-primary/5"
            : complete
              ? "border-border bg-card hover:border-primary/25"
              : "border-border/60 bg-card/50 opacity-60"
        }`}
      >
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          checked={value.verified}
          disabled={!complete}
          onChange={(e) => set({ verified: e.target.checked })}
        />
        <span className="text-xs leading-relaxed">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <ShieldCheck className={`h-3.5 w-3.5 ${value.verified ? "text-primary" : "text-muted-foreground"}`} />
            Confirm this matches my SIP registration
          </span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            {complete
              ? "Reminders and due dates will follow these exact dates."
              : "Pick an interval and start date to confirm."}
          </span>
        </span>
      </label>
    </div>
  );
}
