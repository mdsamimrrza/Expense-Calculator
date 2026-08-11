// ============================================================
// SahakariSIP — XIRR Calculator (Newton-Raphson)
// ============================================================
//
// XIRR solves for r in: Σ [ CFᵢ / (1 + r)^(dᵢ / 365) ] = 0
// where each SIP purchase is a negative CF and current value is a positive CF.
//
// DO NOT simplify to CAGR — XIRR accounts for irregular cash flow timing.
// ============================================================
import type { CashFlow } from "../types";

const MAX_ITERATIONS = 100;
const TOLERANCE = 1e-7;
const DAYS_IN_YEAR = 365;

/**
 * Calculate the XIRR (annualized internal rate of return) for a series of cash flows.
 *
 * @param cashFlows Array of { amount, date } — negative = investment, positive = redemption
 * @returns The annualized return as a decimal (e.g. 0.12 for 12%), or null if:
 *   - Fewer than 2 cash flows
 *   - All cash flows are the same sign
 *   - Newton-Raphson doesn't converge
 */
export function calculateXirr(cashFlows: CashFlow[]): number | null {
  if (cashFlows.length < 2) return null;

  // Verify we have both positive and negative cash flows
  const hasNeg = cashFlows.some((cf) => cf.amount < 0);
  const hasPos = cashFlows.some((cf) => cf.amount > 0);
  if (!hasNeg || !hasPos) return null;

  // Sort by date
  const sorted = [...cashFlows].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const firstDate = sorted[0].date;

  // Day fractions from the first date
  const dayFractions = sorted.map(
    (cf) =>
      (cf.date.getTime() - firstDate.getTime()) / (DAYS_IN_YEAR * 86400000)
  );

  const amounts = sorted.map((cf) => cf.amount);

  // NPV function: Σ [ CFᵢ / (1 + r)^(dᵢ / 365) ]
  function npv(rate: number): number {
    let sum = 0;
    for (let i = 0; i < amounts.length; i++) {
      const base = 1 + rate;
      if (base <= 0) return Infinity;
      sum += amounts[i] / Math.pow(base, dayFractions[i]);
    }
    return sum;
  }

  // Derivative of NPV w.r.t. rate
  function npvDerivative(rate: number): number {
    let sum = 0;
    for (let i = 0; i < amounts.length; i++) {
      const base = 1 + rate;
      if (base <= 0) return Infinity;
      sum +=
        (-dayFractions[i] * amounts[i]) / Math.pow(base, dayFractions[i] + 1);
    }
    return sum;
  }

  // Newton-Raphson iteration
  let rate = 0.1; // Initial guess: 10%

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const f = npv(rate);
    const fPrime = npvDerivative(rate);

    if (Math.abs(fPrime) < 1e-12) {
      // Derivative too small — try a different starting point
      rate = rate + 0.1;
      continue;
    }

    const newRate = rate - f / fPrime;

    if (Math.abs(newRate - rate) < TOLERANCE) {
      // Check for reasonable result (-100% to +1000%)
      if (newRate > -1 && newRate < 10) {
        return newRate;
      }
      return null; // Unreasonable result
    }

    rate = newRate;

    // Guard against divergence
    if (!isFinite(rate) || isNaN(rate)) {
      return null;
    }
  }

  // Did not converge
  return null;
}

/**
 * Build XIRR cash flows from SIP entries and current portfolio value.
 *
 * Each entry is a negative cash flow (money invested).
 * The current value is a positive cash flow on today's date (as if redeemed today).
 */
export function buildCashFlows(
  entries: Array<{ purchase_date: string; amount: number }>,
  currentValue: number
): CashFlow[] {
  const cashFlows: CashFlow[] = entries.map((entry) => ({
    amount: -Number(entry.amount), // Your actual outflow — DP charge is already
                                    // netted into fewer units purchased, not an
                                    // extra cost on top of what you paid
    date: new Date(entry.purchase_date),
  }));

  // Current value as a positive cash flow today
  cashFlows.push({
    amount: currentValue,
    date: new Date(),
  });

  return cashFlows;
}
