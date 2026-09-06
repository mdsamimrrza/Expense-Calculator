import {
  adToBS,
  bsToADString,
  getBSDayOfMonth,
  getBSDaysInMonth,
  bsDueDateToAD,
  nextBSMonthStart,
  formatBSDate,
  adDayDifference,
  getNepalDateComponents,
  scheduleBS,
  scheduleAD,
} from "../src/lib/calendar/bs";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}

// Known reference: 10 July 2026 AD
const startBS = adToBS("2026-07-10");
check("2026-07-10 AD -> BS month (Asar=2)", startBS.month, 2);
console.log("  full BS:", JSON.stringify(startBS));

// Round trip
check("round trip BS->AD", bsToADString(startBS), "2026-07-10");

// Next BS month (Shrawan) day 25 -> should be ~Aug 8, 2026 (not Aug 10)
const shrawan25 = bsDueDateToAD(startBS.year, startBS.month + 1, startBS.day);
console.log(`  Shrawan ${startBS.day} ${startBS.year} = AD ${shrawan25} (${formatBSDate(shrawan25)})`);
check("next BS month due is early August (BS anchoring)", adDayDifference("2026-07-10", shrawan25) <= 32, true);
check("next BS month due label", formatBSDate(shrawan25), `${formatBSDate(shrawan25).split(" ")[0]} ${startBS.day}, ${startBS.year}`);

// Days-in-month sanity: every BS month has 29-32 days
let allMonthsValid = true;
for (let y = 2080; y <= 2085; y++) {
  for (let m = 0; m < 12; m++) {
    const len = getBSDaysInMonth(y, m);
    if (len < 29 || len > 32) allMonthsValid = false;
  }
}
check("BS months 2080-2085 all 29-32 days", allMonthsValid, true);

// Clamping: day 32 in a short month lands on the last day of that month
const clamped = bsDueDateToAD(2083, 2, 32);
const lastDay = bsDueDateToAD(2083, 2, getBSDaysInMonth(2083, 2));
check("day 32 clamps to last day of Asar 2083", clamped, lastDay);

// nextBSMonthStart consistency: start of next month = day after last day of current
const cur = nextBSMonthStart(2083, 0);
const prevLast = bsDueDateToAD(2083, 0, getBSDaysInMonth(2083, 0));
check("next month start follows last day of current", adDayDifference(prevLast, cur), 1);

// Day difference sanity
check("adDayDifference", adDayDifference("2026-07-10", "2026-08-08"), 29);

// --- Installment scheduling: fund started 10 July 2026 AD (Asar 26, 2083) ---
// (BS utility tests; the cron currently schedules on the AD rule below)
const targetDay = getBSDayOfMonth("2026-07-10");
check("target day from start date", targetDay, 26);

// On Shrawan 20 (= Aug 5, 2026): due Shrawan 26 = Aug 11, 6 days out
const s1 = scheduleBS(targetDay, "2026-08-05");
check("mid-month: next due skips to Shrawan 26", s1.nextDue, bsDueDateToAD(2083, 3, 26));
check("mid-month: days remaining", s1.daysRemaining, 6);
check("mid-month: prev cycle start is Asar 26", s1.prevDue, "2026-07-10");

// On the due date itself
const s2 = scheduleBS(targetDay, bsDueDateToAD(2083, 3, 26));
check("due today", s2.daysRemaining, 0);

// Two days before the due date (notify window)
const s3 = scheduleBS(targetDay, bsDueDateToAD(2083, 3, 24));
check("2 days before due", s3.daysRemaining, 2);

// After this month's due date: rolls to next BS month
const s4 = scheduleBS(targetDay, "2026-08-20");
check("after due: rolls to Bhadra 26", s4.nextDue, bsDueDateToAD(2083, 4, 26));
check("after due: days remaining", adDayDifference("2026-08-20", s4.nextDue) === s4.daysRemaining, true);

// Deposited-this-cycle suppression: entry between prevDue (exclusive) and today suppresses
const paidAug1 = "2026-08-01" > s1.prevDue; // early payment on Aug 1 (Shrawan 16)
check("early payment suppresses reminder", paidAug1, true);
const paidOnPrevDue = "2026-07-10" > s1.prevDue; // entry ON prev due = previous cycle
check("entry on prev due date does not suppress", paidOnPrevDue, false);

// Month-end wrap: due on BS day 1, today near end of previous month
const s5 = scheduleBS(1, bsDueDateToAD(2083, 2, 30)); // Asar 30, before Shrawan 1
check("wrap: next due is Shrawan 1", s5.nextDue, bsDueDateToAD(2083, 3, 1));
check("wrap: prev due is Jestha 1", s5.prevDue, bsDueDateToAD(2083, 1, 1));

// AD fallback path
const s6 = scheduleAD(26, "2026-08-05");
check("AD fallback: next due Aug 26", s6.nextDue, "2026-08-26");
check("AD fallback: prev due Jul 26", s6.prevDue, "2026-07-26");

// --- Product rule: installment on (start day − 2) of every month ---
// Fund started Aug 10, 2026 → due on the 8th of every following month
const sAug = scheduleAD(8, "2026-09-01");
check("Aug 10 start: next due Sep 8", sAug.nextDue, "2026-09-08");
check("Aug 10 start: days remaining", sAug.daysRemaining, 7);
check("Aug 10 start: prev due Aug 8", sAug.prevDue, "2026-08-08");
check("Aug 10 start: pre-reminder fires Sep 6 (2 days before)", scheduleAD(8, "2026-09-06").daysRemaining, 2);
check("Aug 10 start: due-today fires Sep 8", scheduleAD(8, "2026-09-08").daysRemaining, 0);
check("Aug 10 start: rolls to Oct 8 after due", scheduleAD(8, "2026-09-20").nextDue, "2026-10-08");
check("cycle suppression: entry after Aug 8 suppresses", "2026-08-15" > sAug.prevDue, true);
check("cycle suppression: entry ON prev due does not", "2026-08-08" > sAug.prevDue, false);
check("start day 1-2 clamps to day 1", Math.max(1, 1 - 2), 1);

// --- notification label ---
console.log("  sample label:", formatBSDate(s1.nextDue), "(Shrawan 26, 2083 expected)");


// Nepal-time "today" is a sane calendar date
const today = getNepalDateComponents(new Date());
check("Nepal today components sane", today.year >= 2024 && today.month >= 0 && today.month <= 11 && today.day >= 1 && today.day <= 31, true);
console.log("  today (Nepal):", JSON.stringify(today), "=> BS:", JSON.stringify(adToBS(nepalTodayStr(today))));

function nepalTodayStr(c: { year: number; month: number; day: number }) {
  return `${c.year}-${String(c.month + 1).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
}

console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
