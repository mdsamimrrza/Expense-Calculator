// ============================================================
// Central SIP schedule engine - automated checks (run: node scripts/test-schedule-engine.ts)
//
// Every date here is TEST DATA. Nothing in this file may be
// mirrored into application defaults.
// ============================================================

import {
  computeSchedule,
  installmentDueDate,
  adToBS,
  bsToADString,
  bsDueDateToAD,
  getBSDaysInMonth,
  formatBSDate,
  type SIPScheduleInput,
} from "../src/lib/calendar/bs.ts";
import { getFundMeta, isFrequencySupported } from "../src/lib/fund-meta.ts";
import { fundConfigSchema } from "../src/lib/schemas/fund-config.ts";
import { resolveSchedule } from "../src/lib/sip-schedule.ts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${ok ? "" : `: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
}

const ad = (frequency: SIPScheduleInput["frequency"], anchorDate: string): SIPScheduleInput => ({
  frequency,
  calendarSystem: "AD",
  anchorDate,
});
const bs = (frequency: SIPScheduleInput["frequency"], anchorDate: string): SIPScheduleInput => ({
  frequency,
  calendarSystem: "BS",
  anchorDate,
});

// ---------- AD month-end & leap year ----------
check("AD Jan 31 -> Feb 28 (non-leap)", installmentDueDate(ad("MONTHLY", "2026-01-31"), 1), "2026-02-28");
check("AD Jan 31 -> Feb 29 (leap)", installmentDueDate(ad("MONTHLY", "2028-01-31"), 1), "2028-02-29");
check("AD Feb 29 anchor -> Mar 29", installmentDueDate(ad("MONTHLY", "2028-02-29"), 1), "2028-03-29");
check("AD Feb 29 anchor -> next Feb 28", installmentDueDate(ad("ANNUALLY", "2028-02-29"), 1), "2029-02-28");
check("AD Mar 31 -> Apr 30", installmentDueDate(ad("MONTHLY", "2026-03-31"), 1), "2026-04-30");
check("AD day 31 persists when month has it", installmentDueDate(ad("MONTHLY", "2026-01-31"), 2), "2026-03-31");

// ---------- Frequencies (AD) ----------
check("QUARTERLY +3 months", installmentDueDate(ad("QUARTERLY", "2026-08-08"), 1), "2026-11-08");
check("SEMI_ANNUALLY +6 months", installmentDueDate(ad("SEMI_ANNUALLY", "2026-08-08"), 1), "2027-02-08");
check("ANNUALLY +1 year", installmentDueDate(ad("ANNUALLY", "2026-08-08"), 1), "2027-08-08");
check("anchor itself is k=0", installmentDueDate(ad("MONTHLY", "2026-08-08"), 0), "2026-08-08");
check("negative steps walk backwards", installmentDueDate(ad("QUARTERLY", "2026-08-08"), -1), "2026-05-08");

// ---------- BS calendar ----------
// Shrawan 2083 has 32 days; Bhadra 2083 has 31; Asar 2083 has 31.
const bsAnchor = bs("MONTHLY", "2026-08-08"); // = Shrawan 23, 2083
check("BS anchor 2026-08-08 is Shrawan 23", adToBS("2026-08-08"), { year: 2083, month: 3, day: 23 });
check("BS monthly k=1 keeps BS day 23", formatBSDate(installmentDueDate(bsAnchor, 1)), "Bhadra 23, 2083");
// Asar 2083 has 32 days; Shrawan 2083 has 31 - the clamp case.
check("BS month-end clamp: Asar 32 -> Shrawan 31", formatBSDate(installmentDueDate(bs("MONTHLY", bsDueDateToAD(2083, 2, 32)), 1)), "Shrawan 31, 2083");
// BS year transition: Chaitra 2083 -> Baisakh 2084
const chaitra = bs("MONTHLY", bsDueDateToAD(2083, 11, 15));
check("BS year transition Chaitra->Baisakh", formatBSDate(installmentDueDate(chaitra, 1)), "Baisakh 15, 2084");
// BS quarterly crosses years
check("BS quarterly from Mangsir 2083 -> Falgun 2083", formatBSDate(installmentDueDate(bs("QUARTERLY", bsDueDateToAD(2083, 7, 10)), 1)), "Falgun 10, 2083");
// No chaining drift: k=12 annual equals 12 monthly steps landing on same BS day
check("BS annual == 12 monthly steps (same BS day)", adToBS(installmentDueDate(bs("ANNUALLY", bsDueDateToAD(2083, 3, 22)), 1)).day, adToBS(installmentDueDate(bs("MONTHLY", bsDueDateToAD(2083, 3, 22)), 12)).day);

// ---------- computeSchedule: next/prev/days ----------
const s1 = computeSchedule(ad("MONTHLY", "2026-08-08"), "2026-09-01");
check("next due after anchor", s1.nextDue, "2026-09-08");
check("prev due is previous occurrence", s1.prevDue, "2026-08-08");
check("days remaining", s1.daysRemaining, 7);
const s2 = computeSchedule(ad("MONTHLY", "2026-08-08"), "2026-08-08");
check("due today", s2.daysRemaining, 0);
check("due today prev is last month", s2.prevDue, "2026-07-08");
// Anchor in the future: first occurrence IS the anchor
const s3 = computeSchedule(ad("MONTHLY", "2026-12-25"), "2026-09-01");
check("future anchor: next due is anchor", s3.nextDue, "2026-12-25");
// Far-past anchor: engine walks forward correctly across years
const s4 = computeSchedule(ad("QUARTERLY", "2020-01-15"), "2026-09-01");
check("long-past quarterly anchor", s4.nextDue, "2026-10-15");

// ---------- Two users, different anchors, same fund & engine ----------
const userA = computeSchedule(bs("MONTHLY", bsDueDateToAD(2083, 4, 22)), "2026-09-20"); // BS 22
const userB = computeSchedule(bs("MONTHLY", bsDueDateToAD(2083, 4, 15)), "2026-09-20"); // BS 15
check("user A anchors to BS 22", formatBSDate(userA.nextDue), "Aswin 22, 2083");
check("user B anchors to BS 15", formatBSDate(userB.nextDue), "Aswin 15, 2083");
check("anchors independent", userA.nextDue !== userB.nextDue, true);

// ---------- Weekend due dates are NOT shifted ----------
// 2026-09-13 is a Sunday; a Sunday anchor must stay on Sundays.
const sun = computeSchedule(ad("MONTHLY", "2026-07-13"), "2026-09-01");
check("Sunday due date not moved", sun.nextDue, "2026-09-13");
check("day of week preserved", new Date(`${sun.nextDue}T12:00:00Z`).getUTCDay(), 0);

// ---------- BS month lengths sanity ----------
check("BS days in Asar 2083", getBSDaysInMonth(2083, 2), 32);
check("BS days in Kartik 2083", getBSDaysInMonth(2083, 6), 30);

// ---------- Fund metadata ----------
check("NIBL frequencies", getFundMeta("NIBL Sahabhagita Fund")?.supportedFrequencies, ["MONTHLY", "QUARTERLY", "SEMI_ANNUALLY", "ANNUALLY"]);
check("NMB frequencies", getFundMeta("NMB Saral Bachat Fund-E")?.supportedFrequencies, ["MONTHLY", "QUARTERLY"]);
check("SSIS frequencies", getFundMeta("SSIS")?.supportedFrequencies, ["MONTHLY", "QUARTERLY"]);
check("unknown fund has NO permissive default", getFundMeta("Some Random Fund"), null);
check("frequency gate rejects unknown fund", isFrequencySupported("Some Random Fund", "MONTHLY"), false);
check("NMB rejects ANNUALLY", isFrequencySupported("NMB Saral Bachat Fund-E", "ANNUALLY"), false);

// ---------- Schema validation ----------
const base = {
  fund_name: "NMB Saral Bachat Fund-E",
  fee_rate_pct: 1.8,
  start_date: "2026-01-10",
  monthly_sip: 1000,
  latest_nav: 10,
};
check("valid unverified schedule accepted", fundConfigSchema.safeParse(base).success, true);
check("below fund minimum rejected", fundConfigSchema.safeParse({ ...base, monthly_sip: 500 }).success, false);
check(
  "verified schedule accepted",
  fundConfigSchema.safeParse({ ...base, frequency: "MONTHLY", calendar_system: "BS", anchor_date: "2026-09-08", schedule_verified: true }).success,
  true
);
const badFreq = fundConfigSchema.safeParse({ ...base, frequency: "ANNUALLY", calendar_system: "AD", anchor_date: "2026-09-08", schedule_verified: true });
check("fund-unsupported frequency rejected", badFreq.success, false);
const unknownFund = fundConfigSchema.safeParse({ ...base, fund_name: "Random Fund", frequency: "MONTHLY", calendar_system: "AD", anchor_date: "2026-09-08", schedule_verified: true });
check("unknown fund cannot be verified", unknownFund.success, false);
const incomplete = fundConfigSchema.safeParse({ ...base, frequency: "MONTHLY", schedule_verified: true });
check("verified-but-incomplete schedule rejected", incomplete.success, false);

// ---------- Amendment: changing anchor/frequency only affects FUTURE dates ----------
// History lives in `entries` and is never recomputed; the engine just answers
// from the new registration. Same today, old vs amended anchor:
const before = computeSchedule(ad("MONTHLY", "2026-05-10"), "2026-09-01").nextDue;
const after = computeSchedule(ad("MONTHLY", "2026-09-15"), "2026-09-01").nextDue; // user amended anchor
check("anchor amendment changes next due", [before, after], ["2026-09-10", "2026-09-15"]);
const freqAfter = computeSchedule(ad("QUARTERLY", "2026-05-10"), "2026-09-01").nextDue;
check("frequency amendment changes cadence", freqAfter, "2026-11-10");

// ---------- BS->AD round trip integrity ----------
const rt = bsToADString(adToBS("2026-10-08"));
check("AD->BS->AD round trip", rt, "2026-10-08");

// ---------- Bank-confirmed fallback: unregistered schedule recurs in BS ----------
const fallback = resolveSchedule({
  frequency: null,
  calendar_system: null,
  anchor_date: null,
  start_date: "2026-08-08", // Shrawan 23, 2083
  schedule_verified: false,
});
check("fallback uses BS calendar", fallback.sip.calendarSystem, "BS");
check("fallback is monthly", fallback.sip.frequency, "MONTHLY");
// Next occurrence keeps the BS day of the initial payment date (bank rule)
check("fallback repeats BS day, not AD day", formatBSDate(installmentDueDate(fallback.sip, 1)), "Bhadra 23, 2083");
const confirmed = resolveSchedule({
  frequency: "QUARTERLY",
  calendar_system: "AD",
  anchor_date: "2026-09-01",
  start_date: "2026-08-08",
  schedule_verified: true,
});
check("confirmed schedule wins", [confirmed.source, confirmed.sip.frequency], ["registered", "QUARTERLY"]);

console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
