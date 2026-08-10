// ============================================================
// SahakariSIP — Formatting Utilities
// ============================================================

import { format, formatDistanceToNow } from "date-fns";
import { CURRENCY_CODE, CURRENCY_LOCALE } from "./constants";

/**
 * Format a number as NPR currency with international digit grouping.
 * e.g. 1234567.89 → "NPR 1,234,567.89"
 */
export function formatCurrency(value: number, showSign = false): string {
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  const sign = showSign && value > 0 ? "+" : value < 0 ? "-" : "";
  return `${CURRENCY_CODE} ${sign}${formatted}`;
}

/**
 * Format a number as NPR without decimals (for summary cards).
 * e.g. 1234567 → "NPR 1,234,567"
 */
export function formatCurrencyWhole(value: number, showSign = false): string {
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));

  const sign = showSign && value > 0 ? "+" : value < 0 ? "-" : "";
  return `${CURRENCY_CODE} ${sign}${formatted}`;
}

/**
 * Format a percentage value.
 * e.g. 12.345 → "+12.35%" or "-3.20%"
 */
export function formatPercentage(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format units with 4 decimal places (standard mutual fund precision).
 * e.g. 12345.6789 → "12,345.6789"
 */
export function formatUnits(value: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

/**
 * Format NAV with 2 decimal places.
 * e.g. 13.25 → "13.25"
 */
export function formatNav(value: number): string {
  return value.toFixed(2);
}

/**
 * Format a date string for display.
 * e.g. "2024-03-15" → "Mar 15, 2024"
 */
export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy");
}

/**
 * Format a date for chart axis.
 * e.g. "2024-03-15" → "Mar '24"
 */
export function formatDateShort(dateStr: string): string {
  return format(new Date(dateStr), "MMM ''yy");
}

/**
 * Format a date as relative time.
 * e.g. "2 days ago"
 */
export function formatRelativeDate(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

/**
 * Format a month key.
 * e.g. "2024-03" → "Mar 2024"
 */
export function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return format(date, "MMM yyyy");
}

/**
 * Format SIP streak for display.
 * e.g. 14 → "14 months 🔥", 0 → "0 months"
 */
export function formatStreak(months: number): string {
  if (months === 0) return "0 months";
  const label = months === 1 ? "1 month" : `${months} months`;
  return months >= 3 ? `${label} 🔥` : label;
}
