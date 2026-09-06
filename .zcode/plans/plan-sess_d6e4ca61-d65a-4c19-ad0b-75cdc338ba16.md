## BS-Calendar Installment Reminders

**Goal:** Monthly installment reminders follow the Bikram Sambat calendar. A fund started on 10 July AD (Ashar 25 BS) gets its next reminder due on the 25th of the current BS month (e.g., Shrawan 25 = Aug 8 AD), instead of the 10th of each AD month. Scope: reminder cron only; UI keeps displaying AD dates.

### 1. Add BS↔AD conversion library
- `npm install nepali-date-converter` (v3.4.0, TypeScript, converts both directions, covers ~1921–2041 AD).
- New utility `src/lib/calendar/bs.ts` wrapping it:
  - `toBS(adDate)` / `toAD(bsDate)`
  - `getBSDayOfMonth(adDate)` — e.g. 10 July 2026 → 25
  - `bsMonthToADRange(bsYear, bsMonth)` — AD start/end boundaries of a BS month (needed for the "already deposited" query window)
  - `bsDueDateToAD(bsYear, bsMonth, day, )` — with **clamping**: if a BS month is shorter than the target day (BS months are 29–32 days and vary by year), clamp to the last day of that BS month
  - `formatBSDate(adDate)` — "Shrawan 25, 2082" for notification text

### 2. Rework the cron scheduling (`src/app/api/cron/reminders/route.ts`)
- For each fund, derive the **target BS day-of-month from `fund.start_date`** (converted to BS). `start_date` is already selected at line 38 — it finally gets used.
- Each run: convert today to BS, compute the current BS month's due date as an AD date, and use the **real AD day difference** between today and that due date for the notify window (`daysRemaining === 0` or `=== notify_days_before`).
  - Side benefit: this fixes the existing bug where "days before" reminders can never fire when the due day is the 1st or 2nd (day-diff is now computed across real dates, not `targetDay - currentDay`).
- Fix the "already deposited this month" check to use the **current BS month's AD window** (`bsMonthToADRange`) instead of AD month boundaries (lines 86–97). Without this, a July 10 deposit (Ashar 25 BS) would wrongly suppress the Shrawan 25 reminder in August.
- Notification/email text shows the BS due date with AD in parentheses, e.g. "due on Shrawan 25, 2082 (Aug 8, 2026)". Email helper `sendInstallmentReminderEmail` already takes a preformatted string — just pass the new one.
- Fallback: if a date falls outside the library's convertible range, fall back to the current AD-based behavior so the cron never crashes.

### 3. Verify
- Sanity-test conversions against known reference dates (e.g., 10 July 2026 ↔ Ashar/Shrawan 2083) with a quick `tsx` script.
- Trace the cron end-to-end for a fund started 10 July 2026: confirm reminder fires on the AD date corresponding to the 25th of each BS month, and is suppressed once an entry exists in the current BS month.

No DB migration needed — everything stays stored as AD `DATE`; conversion happens only at the scheduling/display boundary. Settings UI and `reminder_day` preference remain untouched (no longer used for scheduling; can be repurposed later as an override).