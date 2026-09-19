// ============================================================
// Shared types for external NAV source adapters.
//
// Each adapter knows how to talk to one fund manager's website
// and turn their data into simple { nav, date } quotes.
// ============================================================

/** A single NAV observation from a fund manager's site. */
export interface NavQuote {
  /** ISO date (AD), e.g. "2026-09-17" */
  date: string;
  /** NAV value in NPR */
  nav: number;
}

export interface NavSourceAdapter {
  /** Latest published NAV for the given source code. */
  fetchLatest(code: string): Promise<NavQuote | null>;
  /**
   * Full available daily NAV history (used only by the one-time
   * backfill mode). Adapters that cannot backfill return [].
   */
  fetchHistory(code: string): Promise<NavQuote[]>;
}
