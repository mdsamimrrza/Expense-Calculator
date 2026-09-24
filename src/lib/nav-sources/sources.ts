// ============================================================
// Fund name → NAV source resolution.
//
// The cron fetches STRICTLY per configured fund: a fund whose
// name matches one of the known sources below gets its NAV
// fetched from that source; anything else is skipped entirely.
// ============================================================

import type { NavSourceAdapter } from "./types";
import { siddharthaAdapter } from "./siddhartha";
import { nimbaceAdapter } from "./nimbace";
import { nmbAdapter } from "./nmb";

export type SourceId = "nmb" | "nimbace" | "siddhartha";

const ADAPTERS: Record<SourceId, NavSourceAdapter> = {
  nmb: nmbAdapter,
  nimbace: nimbaceAdapter,
  siddhartha: siddharthaAdapter,
};

export const SOURCE_LABELS: Record<SourceId, string> = {
  nmb: "NMB Capital",
  nimbace: "NIMB Ace Capital",
  siddhartha: "Siddhartha Capital",
};

interface KnownFund {
  source: SourceId;
  /** Source-specific code: NMB scheme id, NIMB page path, Siddhartha scheme_id. */
  code: string;
  /** fund_name spellings this entry matches (normalized at lookup). */
  names: string[];
}

const KNOWN_FUNDS: KnownFund[] = [
  {
    source: "nmb",
    code: "4",
    names: ["NMB Saral Bachat Fund-E", "NMB Saral Bachat Fund", "NMBSBFE"],
  },
  {
    source: "nimbace",
    code: "/nav-nibl-sahabhagita-fund/",
    names: ["NIBL Sahabhagita Fund"],
  },
  {
    source: "siddhartha",
    code: "3",
    names: ["SSIS", "Siddhartha Systematic Investment Scheme"],
  },
];

/**
 * Normalize a fund name so spelling variants match:
 * lowercase, hyphens/slashes collapsed, and spaces removed
 * entirely - "NMB Saral Bachat Fund - E", "…Fund -E" and
 * "…Fund-E" all become "nmbsaralbachatfund-e".
 */
export function normalizeFundName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_-]*-[\s_-]*/g, "-")
    .replace(/[\s_]+/g, "")
    .trim();
}

export interface ResolvedFundSource {
  source: SourceId;
  label: string;
  code: string;
  adapter: NavSourceAdapter;
}

/**
 * Resolve a user's configured fund name to its NAV source.
 * Returns null for funds we have no source for - the caller
 * must skip those (never guess a source).
 */
export function resolveFundSource(fundName: string): ResolvedFundSource | null {
  const normalized = normalizeFundName(fundName);
  for (const known of KNOWN_FUNDS) {
    if (known.names.some((n) => normalizeFundName(n) === normalized)) {
      return {
        source: known.source,
        label: SOURCE_LABELS[known.source],
        code: known.code,
        adapter: ADAPTERS[known.source],
      };
    }
  }
  return null;
}
