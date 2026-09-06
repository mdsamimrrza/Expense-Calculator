import NepaliDate from "nepali-date-converter";

/**
 * Bikram Sambat (BS) calendar helpers.
 *
 * All dates are stored in the database as Gregorian (AD) "YYYY-MM-DD" strings;
 * conversion to/from BS happens only at the scheduling and display boundary.
 * The cron runs on UTC servers, so AD date components are always extracted in
 * Asia/Kathmandu time — never from the server's local timezone.
 */

export const BS_MONTH_NAMES = [
  "Baisakh",
  "Jestha",
  "Asar",
  "Shrawan",
  "Bhadra",
  "Aswin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

export interface BSDate {
  /** BS year, e.g. 2083 */
  year: number;
  /** BS month index 0-11 (0 = Baisakh) */
  month: number;
  /** BS day of month, 1-32 */
  day: number;
}

const kathmanduFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kathmandu",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar-day components of an instant in Nepal time. */
export function getNepalDateComponents(date: Date): { year: number; month: number; day: number } {
  const parts = kathmanduFormatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month") - 1, day: get("day") };
}

/** AD date as "YYYY-MM-DD" for a given Nepal-calendar day. */
export function adToString({ year, month, day }: { year: number; month: number; day: number }): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Today's AD date ("YYYY-MM-DD") in Nepal time, regardless of server timezone. */
export function nepalTodayAD(): string {
  return adToString(getNepalDateComponents(new Date()));
}

/** Parse an AD "YYYY-MM-DD" string into Nepal-calendar day components. */
export function parseADString(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month: month - 1, day };
}

/** Convert an AD "YYYY-MM-DD" string to BS. Throws if outside the library's supported range (BS 2000-2090). */
export function adToBS(dateStr: string): BSDate {
  const { year, month, day } = parseADString(dateStr);
  // Noon UTC keeps the calendar day stable under any server timezone, since the
  // library reads local-time components from the JS Date.
  const bs = new NepaliDate(new Date(Date.UTC(year, month, day, 12)));
  return { year: bs.getYear(), month: bs.getMonth(), day: bs.getDate() };
}

/** Convert a BS date to an AD "YYYY-MM-DD" string. Throws if outside the library's supported range. */
export function bsToADString(bs: BSDate): string {
  const ad = new NepaliDate(bs.year, bs.month, bs.day).getAD();
  return adToString({ year: ad.year, month: ad.month, day: ad.date });
}

/** BS day-of-month (1-32) for an AD "YYYY-MM-DD" string. */
export function getBSDayOfMonth(dateStr: string): number {
  return adToBS(dateStr).day;
}

/** Number of days in a BS month (BS months have 29-32 days depending on the year). */
export function getBSDaysInMonth(year: number, month: number): number {
  const next = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  const nextStartAD = bsToADString({ year: next.year, month: next.month, day: 1 });
  const { year: y, month: m, day: d } = parseADString(nextStartAD);
  const lastDay = new Date(Date.UTC(y, m, d) - 24 * 60 * 60 * 1000);
  const lastDayStr = `${lastDay.getUTCFullYear()}-${String(lastDay.getUTCMonth() + 1).padStart(2, "0")}-${String(lastDay.getUTCDate()).padStart(2, "0")}`;
  // The BS day number of the month's final day is the month's length.
  return adToBS(lastDayStr).day;
}

/**
 * AD "YYYY-MM-DD" of a due date in a BS month, clamped to the last day of that
 * month when the target day exceeds the month's length (e.g. day 32 in a
 * 31-day month lands on the 31st).
 */
export function bsDueDateToAD(year: number, month: number, targetDay: number): string {
  const daysInMonth = getBSDaysInMonth(year, month);
  return bsToADString({ year, month, day: Math.min(targetDay, daysInMonth) });
}

/** Start of the next BS month as an AD "YYYY-MM-DD" string. */
export function nextBSMonthStart(year: number, month: number): string {
  const next = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  return bsToADString({ year: next.year, month: next.month, day: 1 });
}

/** "Shrawan 25, 2082" style label for an AD "YYYY-MM-DD" string. */
export function formatBSDate(dateStr: string): string {
  const bs = adToBS(dateStr);
  return `${BS_MONTH_NAMES[bs.month]} ${bs.day}, ${bs.year}`;
}

/** Whole-day difference between two AD "YYYY-MM-DD" strings (b - a). */
export function adDayDifference(a: string, b: string): number {
  const toUTC = (s: string) => {
    const { year, month, day } = parseADString(s);
    return Date.UTC(year, month, day);
  };
  return Math.round((toUTC(b) - toUTC(a)) / (24 * 60 * 60 * 1000));
}

export interface DueSchedule {
  /** Next upcoming installment due date, "YYYY-MM-DD" */
  nextDue: string;
  /** Previous installment due date (start of the current payment cycle), "YYYY-MM-DD" */
  prevDue: string;
  /** Whole days from today until nextDue */
  daysRemaining: number;
}

// BS-calendar scheduling. Not used by the reminder cron (the product
// schedules on a fixed AD day-of-month via scheduleAD); kept for future BS
// features and verified by tests.
export function scheduleBS(targetDay: number, todayStr: string): DueSchedule {
  const todayBS = adToBS(todayStr);
  const nextMonth = todayBS.month === 11 ? { y: todayBS.year + 1, m: 0 } : { y: todayBS.year, m: todayBS.month + 1 };
  const prevMonth = todayBS.month === 0 ? { y: todayBS.year - 1, m: 11 } : { y: todayBS.year, m: todayBS.month - 1 };
  const thisMonthDue = bsDueDateToAD(todayBS.year, todayBS.month, targetDay);
  const nextMonthDue = bsDueDateToAD(nextMonth.y, nextMonth.m, targetDay);
  const nextDue = thisMonthDue >= todayStr ? thisMonthDue : nextMonthDue;
  const prevDue = bsDueDateToAD(prevMonth.y, prevMonth.m, targetDay);
  return { nextDue, prevDue, daysRemaining: adDayDifference(todayStr, nextDue) };
}

// Monthly scheduling on a fixed AD day-of-month. The reminder cron uses this
// with the installment day set to (start day − 2) — e.g. a fund started on the
// 10th is due on the 8th of every following month. Day is clamped to 28 so
// every month has it.
export function scheduleAD(targetDay: number, todayStr: string): DueSchedule {
  const { year, month } = parseADString(todayStr);
  const day = Math.min(Math.max(1, targetDay), 28);
  const fmt = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const thisMonthDue = fmt(year, month);
  const nextMonth = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  const prevMonth = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const nextDue = thisMonthDue >= todayStr ? thisMonthDue : fmt(nextMonth.y, nextMonth.m);
  return { nextDue, prevDue: fmt(prevMonth.y, prevMonth.m), daysRemaining: adDayDifference(todayStr, nextDue) };
}
