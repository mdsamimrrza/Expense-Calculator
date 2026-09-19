// ============================================================
// NIMB Ace Capital (nimbacecapital.com) NAV adapter.
//
// Each fund has a NAV page (e.g. /nav-nibl-sahabhagita-fund/)
// whose daily/weekly/monthly tables are loaded via admin-ajax.
// The inline script embeds a rotating nonce, so a fetch must:
//   1. GET the fund page and extract `nonce` + `mutual_fund`
//   2. POST /wp-admin/admin-ajax.php with
//      action=load_mutual_fund_table&type=daily&page=N
// The response is `data.html` — an HTML fragment of <tr> rows:
//   <td>17/September/2026</td><td>1/Ashwin/2083</td><td>10.14</td>
// ============================================================

import type { NavQuote, NavSourceAdapter } from "./types";

const SITE = "https://nimbacecapital.com";

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** "17/September/2026" → "2026-09-17" */
export function parseAdDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\/([A-Za-z]+)\/(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function parseRows(html: string): NavQuote[] {
  const quotes: NavQuote[] = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(html)) !== null) {
    const cells = Array.from(row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((c) =>
      c[1].replace(/<[^>]*>/g, "").replace(/\//g, "/").trim()
    );
    if (cells.length < 3) continue;
    const date = parseAdDate(cells[0]);
    const nav = parseFloat(cells[2]);
    if (date && Number.isFinite(nav)) {
      quotes.push({ date, nav });
    }
  }
  return quotes;
}

interface PageConfig {
  nonce: string;
  mutualFund: string;
}

async function getPageConfig(pagePath: string): Promise<PageConfig> {
  const res = await fetch(`${SITE}${pagePath}`, {
    headers: { "User-Agent": "Mozilla/5.0 (SahakariSIP NAV fetch)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`NIMB Ace page ${pagePath} responded ${res.status}`);
  }
  const html = await res.text();
  // Matches the inline loader: nonce: 'b33cd88c71', mutual_fund: 'nibl-...-nav'
  const nonce = html.match(/nonce:\s*['"]([a-f0-9]{6,20})['"]/)?.[1];
  const mutualFund = html.match(/mutual_fund:\s*['"]([a-z0-9-]+)['"]/)?.[1];
  if (!nonce || !mutualFund) {
    throw new Error("NIMB Ace page did not expose its table nonce/slug");
  }
  return { nonce, mutualFund };
}

async function fetchTable(
  config: PageConfig,
  page: number,
  entries: number
): Promise<NavQuote[]> {
  const body = new URLSearchParams({
    action: "load_mutual_fund_table",
    nonce: config.nonce,
    mutual_fund: config.mutualFund,
    type: "daily",
    page: String(page),
    search: "",
    entries: String(entries),
  });

  const res = await fetch(`${SITE}/wp-admin/admin-ajax.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`NIMB Ace ajax responded ${res.status}`);
  }
  const json = (await res.json()) as { success?: boolean; data?: { html?: string } };
  return parseRows(json.data?.html ?? "");
}

/** The code is the fund page path, e.g. "/nav-nibl-sahabhagita-fund/". */
export const nimbaceAdapter: NavSourceAdapter = {
  async fetchLatest(code) {
    const config = await getPageConfig(code);
    // Newest rows are on page 1 of the daily table.
    const quotes = await fetchTable(config, 1, 10);
    if (quotes.length === 0) return null;
    return quotes.reduce((a, b) => (b.date > a.date ? b : a));
  },

  async fetchHistory(code) {
    const config = await getPageConfig(code);
    // The endpoint caps `entries`; 100 is accepted and keeps the
    // number of page requests reasonable (~15 pages for 1500 rows).
    const PAGE_SIZE = 100;
    const byDate = new Map<string, number>();
    for (let page = 1; page <= 60; page++) {
      const quotes = await fetchTable(config, page, PAGE_SIZE);
      if (quotes.length === 0) break;
      for (const q of quotes) byDate.set(q.date, q.nav);
      if (quotes.length < PAGE_SIZE) break;
    }
    return Array.from(byDate.entries())
      .map(([date, nav]) => ({ date, nav }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
};
