// ============================================================
// Siddhartha Capital (siddharthacapital.com) NAV adapter.
//
// The NAV details page (scheme-reports/nav-details) loads its
// table via a WordPress admin-ajax action that returns clean
// JSON with both AD and BS dates. No nonce required.
//   POST /wp-admin/admin-ajax.php
//   action=scheme_data_filter&scheme_id=<n>&type=daily&year=<bs>
//
// Scheme ids: 1=SEF 2=SIGS-2 3=SSIS 4=SIGS-3 5=SEF-2
// (SSIS, scheme_id 3, is the only one that publishes daily.)
// ============================================================

import type { NavQuote, NavSourceAdapter } from "./types";

const AJAX_URL = "https://www.siddharthacapital.com/wp-admin/admin-ajax.php";

interface SiddharthaNavRow {
  nav: string;
  eng_date: string;
  nep_date: string;
  is_week_end: string;
}

async function fetchRows(
  schemeId: string,
  params: Record<string, string>
): Promise<SiddharthaNavRow[]> {
  const body = new URLSearchParams({
    action: "scheme_data_filter",
    scheme_id: schemeId,
    type: "daily",
    ...params,
  });

  const res = await fetch(AJAX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Siddhartha responded ${res.status}`);
  }

  const json = (await res.json()) as { success?: boolean; data?: SiddharthaNavRow[] };
  return Array.isArray(json.data) ? json.data : [];
}

function toQuotes(rows: SiddharthaNavRow[]): NavQuote[] {
  const out: NavQuote[] = [];
  for (const row of rows) {
    const nav = parseFloat(row.nav);
    // eng_date is already ISO (e.g. "2026-09-17")
    if (!Number.isFinite(nav) || !/^\d{4}-\d{2}-\d{2}$/.test(row.eng_date)) continue;
    out.push({ date: row.eng_date, nav });
  }
  return out;
}

export const siddharthaAdapter: NavSourceAdapter = {
  async fetchLatest(schemeId) {
    // No year filter → the API returns the newest rows first.
    const rows = await fetchRows(schemeId, {});
    const quotes = toQuotes(rows);
    if (quotes.length === 0) return null;
    // Rows arrive newest-first; pick the max date defensively.
    return quotes.reduce((a, b) => (b.date > a.date ? b : a));
  },

  async fetchHistory(schemeId) {
    // The table is paginated by Bikram Sambat year (2074–2083).
    const byDate = new Map<string, number>();
    for (let year = 2074; year <= 2083; year++) {
      try {
        const rows = await fetchRows(schemeId, { year: String(year) });
        for (const q of toQuotes(rows)) {
          // Keep the last value seen per date
          byDate.set(q.date, q.nav);
        }
      } catch {
        // One missing BS year shouldn't abort the whole backfill.
      }
    }
    return Array.from(byDate.entries())
      .map(([date, nav]) => ({ date, nav }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
};
