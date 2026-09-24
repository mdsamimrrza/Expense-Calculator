// Runnable check for the tax module - no framework, mirrors test-bs-calendar.ts.
// Run: npx tsx scripts/test-tax-engine.ts
import {
  getCapitalGainsStatus,
  getExitLoadSchedule,
  getExitLoadRatePct,
  getHoldingDays,
  getTaxStatusSummary,
  estimateBucketedCgt,
  CGT_NP_REDEMPTION,
} from "../src/lib/tax.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}

// 1. CGT verified schedule: bank-confirmed 2026-09-24 — 5% under 1 year,
//    3.75% over 1 year, auto-deducted at redemption.
const cgt = getCapitalGainsStatus();
check("CGT status is VERIFIED", cgt.status, "VERIFIED");
check("long-term rate is 3.75%", CGT_NP_REDEMPTION.longTermRatePct, 3.75);
check("short-term rate is 5%", CGT_NP_REDEMPTION.shortTermRatePct, 5);
check("long-term threshold is 365 days", CGT_NP_REDEMPTION.longTermOverDays, 365);
const bucket = estimateBucketedCgt(100000, 50000);
check("bucketed CGT: long leg", bucket.long, 3750);
check("bucketed CGT: short leg", bucket.short, 2500);
check("bucketed CGT: total", bucket.total, 6250);
check("no negative gains taxed", estimateBucketedCgt(-1000, -2000).total, 0);

// 2. SSIS exit load - official: 1.5% within 1 year, 0% after.
const ssis = getExitLoadSchedule("SSIS");
check("SSIS schedule exists and is VERIFIED", ssis?.status, "VERIFIED");
check("SSIS source URL recorded", ssis?.officialSourceUrl, "https://www.siddharthacapital.com/ssis-faq/");
if (ssis) {
  check("SSIS day 30 -> 1.5%", getExitLoadRatePct(ssis, 30), 1.5);
  check("SSIS day 364 -> 1.5%", getExitLoadRatePct(ssis, 364), 1.5);
  check("SSIS day 365 (boundary) -> 0%", getExitLoadRatePct(ssis, 365), 0);
  check("SSIS day 800 -> 0%", getExitLoadRatePct(ssis, 800), 0);
}

// 3. NIBL Sahabhagita - official 4-tier schedule + 0% after 24 months.
const nibl = getExitLoadSchedule("NIBL Sahabhagita Fund");
check("NIBL schedule exists and is VERIFIED", nibl?.status, "VERIFIED");
if (nibl) {
  check("NIBL day 30 -> 1.5%", getExitLoadRatePct(nibl, 30), 1.5);
  check("NIBL day 182 -> 1.5%", getExitLoadRatePct(nibl, 182), 1.5);
  check("NIBL day 183 (boundary) -> 1.25%", getExitLoadRatePct(nibl, 183), 1.25);
  check("NIBL day 365 (boundary) -> 1.0%", getExitLoadRatePct(nibl, 365), 1.0);
  check("NIBL day 548 (boundary) -> 0.75%", getExitLoadRatePct(nibl, 548), 0.75);
  check("NIBL day 730 (boundary) -> 0%", getExitLoadRatePct(nibl, 730), 0);
  check("NIBL day 900 -> 0%", getExitLoadRatePct(nibl, 900), 0);
}

// 4. Unknown / unverified fund: NEVER assume 0% - signal "no schedule".
check("NMB has no verified schedule (null, not 0%)", getExitLoadSchedule("NMB Saral Bachat Fund-E"), null);
check("Unknown fund returns null", getExitLoadSchedule("Some Random Fund"), null);

// 5. Summary aggregates verified vs unverified funds without inventing rates.
const summary = getTaxStatusSummary(["SSIS", "NIBL Sahabhagita Fund", "NMB Saral Bachat Fund-E"]);
check("summary: CGT verified", summary.cgtStatus, "VERIFIED");
check("summary: 2 verified exit loads", summary.exitLoadVerified.length, 2);
check("summary: NMB listed as unverified", summary.exitLoadUnverified, ["NMB Saral Bachat Fund-E"]);

// 6. Holding period is per purchase date, in days.
const asOf = new Date("2026-09-24T00:00:00Z").getTime();
check("holding days for 2026-01-01 purchase", Math.floor(getHoldingDays("2026-01-01", asOf)), 266);
check("holding days same day = 0", Math.floor(getHoldingDays("2026-09-24", asOf)), 0);

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);