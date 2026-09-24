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
} from "../src/lib/calendar/bs.ts";

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

// Nepal-time "today" is a sane calendar date
const today = getNepalDateComponents(new Date());
check("Nepal today components sane", today.year >= 2024 && today.month >= 0 && today.month <= 11 && today.day >= 1 && today.day <= 31, true);
console.log("  today (Nepal):", JSON.stringify(today), "=> BS:", JSON.stringify(adToBS(nepalTodayStr(today))));

function nepalTodayStr(c: { year: number; month: number; day: number }) {
  return `${c.year}-${String(c.month + 1).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
}

console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
