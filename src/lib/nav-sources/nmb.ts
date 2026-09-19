// ============================================================
// NMB Capital (nmbcl.com.np) NAV adapter.
//
// The site is a Vue SPA backed by a Laravel JSON API under
// /frontapi/en/ that requires the X-Requested-With header.
//   GET /frontapi/en/scheme                      → scheme list
//   GET /frontapi/en/getNavHistory?schemeId=<n>&from=&to=&type=daily
//     → { date: ["2022-01-18", ...], data: [10.68, ...] }
//
// Scheme ids: 4 = NMB Saral Bachat Fund - E.
// One endpoint serves both the latest quote (last row) and the
// full daily history (~1700 rows since Jan 2022).
// ============================================================

import type { NavQuote, NavSourceAdapter } from "./types";

const API_BASE = "https://www.nmbcl.com.np/frontapi/en";

interface NavHistoryResponse {
  date: string[];
  data: number[];
}

async function fetchHistoryPage(
  schemeId: string,
  from: string,
  to: string
): Promise<NavQuote[]> {
  const url =
    `${API_BASE}/getNavHistory?schemeId=${encodeURIComponent(schemeId)}` +
    `&from=${from}&to=${to}&type=daily`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    throw new Error(`NMB API responded ${res.status}`);
  }

  const json = (await res.json()) as NavHistoryResponse;
  const dates = Array.isArray(json.date) ? json.date : [];
  const values = Array.isArray(json.data) ? json.data : [];

  const quotes: NavQuote[] = [];
  for (let i = 0; i < dates.length && i < values.length; i++) {
    const nav = Number(values[i]);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dates[i]) && Number.isFinite(nav)) {
      quotes.push({ date: dates[i], nav });
    }
  }
  return quotes;
}

/** The code is NMB's numeric scheme id, e.g. "4". */
export const nmbAdapter: NavSourceAdapter = {
  async fetchLatest(code) {
    const quotes = await fetchHistoryPage(code, "", "");
    if (quotes.length === 0) return null;
    return quotes.reduce((a, b) => (b.date > a.date ? b : a));
  },

  async fetchHistory(code) {
    // Empty from/to returns the full daily series.
    return fetchHistoryPage(code, "", "");
  },
};
