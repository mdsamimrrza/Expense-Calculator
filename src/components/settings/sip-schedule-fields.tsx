"use client";

// ============================================================
// Registered SIP schedule fields - the ONLY place users state
// their actual registered due date. Frequency options come from
// fund metadata (src/lib/fund-meta.ts); nothing is inferred.
// Used by both the settings edit dialog and onboarding.
// ============================================================

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adToBS,
  bsDueDateToAD,
  formatBSDate,
  BS_MONTH_NAMES,
  type SIPFrequency,
  type CalendarSystem,
} from "@/lib/calendar/bs";
import { getFundMeta } from "@/lib/fund-meta";

export const FREQUENCY_LABELS: Record<SIPFrequency, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUALLY: "Semi-annual",
  ANNUALLY: "Annual",
};

export interface SIPScheduleValue {
  frequency: SIPFrequency | null;
  calendarSystem: CalendarSystem | null;
  /** Registered first due date, AD "YYYY-MM-DD". */
  anchorDate: string | null;
  verified: boolean;
}

export const EMPTY_SCHEDULE: SIPScheduleValue = {
  frequency: null,
  calendarSystem: null,
  anchorDate: null,
  verified: false,
};

/** Flat FormData fields for the schedule, for the server action to parse. */
export function scheduleToFormFields(value: SIPScheduleValue): Record<string, string> {
  return {
    frequency: value.frequency ?? "",
    calendar_system: value.calendarSystem ?? "",
    anchor_date: value.anchorDate ?? "",
    schedule_verified: String(value.verified),
  };
}

interface Props {
  fundName: string;
  value: SIPScheduleValue;
  onChange: (next: SIPScheduleValue) => void;
}

export function SIPScheduleFields({ fundName, value, onChange }: Props) {
  const meta = getFundMeta(fundName);

  if (!meta) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-amber-500">Unverified fund.</span>{" "}
        SahakariSIP has no official configuration for "{fundName || "this fund"}", so
        an exact schedule cannot be confirmed here. Installments follow your SIP
        registration date monthly until the fund is verified - the app never invents
        any other date.
      </div>
    );
  }

  const set = (patch: Partial<SIPScheduleValue>) => onChange({ ...value, ...patch });
  const complete = Boolean(value.frequency && value.calendarSystem && value.anchorDate);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Registered SIP Schedule
      </p>
      <p className="text-[11px] text-muted-foreground">
        Enter what your SIP registration form actually says. Unlimited SIP only -
        no maturity date or installment count.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Frequency</Label>
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
          <Label className="text-xs">Calendar</Label>
          <Select
            value={value.calendarSystem ?? ""}
            onValueChange={(v) =>
              set({ calendarSystem: v as CalendarSystem, anchorDate: null, verified: false })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {meta.supportedCalendarSystems.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "AD" ? "AD (Gregorian)" : "BS (Bikram Sambat)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {value.calendarSystem === "AD" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Registered first SIP due date (AD)</Label>
          <Input
            type="date"
            className="h-9"
            value={value.anchorDate ?? ""}
            onChange={(e) => set({ anchorDate: e.target.value || null, verified: false })}
          />
          {value.anchorDate && (
            <p className="text-[11px] text-muted-foreground">
              = {formatBSDate(value.anchorDate)} BS
            </p>
          )}
        </div>
      )}

      {value.calendarSystem === "BS" && (
        <BSAnchorInput
          anchorDate={value.anchorDate}
          onChange={(ad) => set({ anchorDate: ad, verified: false })}
        />
      )}

      {complete && (
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 accent-primary"
            checked={value.verified}
            onChange={(e) => set({ verified: e.target.checked })}
          />
          <span>
            <span className="font-semibold text-foreground">Confirm schedule.</span>{" "}
            Reminders and due dates will follow these exact dates.
          </span>
        </label>
      )}
    </div>
  );
}

/** BS day/month/year picker. Stores the anchor as AD via the verified conversion. */
function BSAnchorInput({
  anchorDate,
  onChange,
}: {
  anchorDate: string | null;
  onChange: (ad: string | null) => void;
}) {
  const bs = anchorDate ? safeAdToBS(anchorDate) : null;
  // Local drafts so day/month/year can be entered in any order.
  const [day, setDay] = useState<string>(bs ? String(bs.day) : "");
  const [month, setMonth] = useState<string>(bs ? String(bs.month) : "");
  const [year, setYear] = useState<string>(bs ? String(bs.year) : "");

  const tryEmit = (d: string, m: string, y: string) => {
    const dayN = Number(d);
    if (!d || !m || !y || !dayN || dayN < 1 || dayN > 32) return;
    try {
      onChange(bsDueDateToAD(Number(y), Number(m), dayN));
    } catch {
      // Outside the verified calendar range - not emitted.
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Registered first SIP due date (BS)</Label>
      <div className="grid grid-cols-[1fr_1.4fr_0.9fr] gap-2">
        <Input
          type="number"
          min={1}
          max={32}
          placeholder="Day"
          className="h-9"
          value={day}
          onChange={(e) => {
            setDay(e.target.value);
            tryEmit(e.target.value, month, year);
          }}
        />
        <Select
          value={month}
          onValueChange={(m) => {
            setMonth(m);
            tryEmit(day, m, year);
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {BS_MONTH_NAMES.map((name, i) => (
              <SelectItem key={name} value={String(i)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={2000}
          max={2090}
          placeholder="Year"
          className="h-9"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            tryEmit(day, month, e.target.value);
          }}
        />
      </div>
      {anchorDate && (
        <p className="text-[11px] text-muted-foreground">= {anchorDate} AD</p>
      )}
    </div>
  );
}

function safeAdToBS(dateStr: string) {
  try {
    return adToBS(dateStr);
  } catch {
    return null;
  }
}
