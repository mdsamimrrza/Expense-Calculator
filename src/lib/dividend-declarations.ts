// ============================================================
// SahakariSIP - Verified dividend declarations (reference data)
//
// Real distributions declared by the fund managers, one row per
// record (book-closure) date. Amounts a unitholder receives are
// derived from these, never guessed:
//   per_unit = dividendPct x Rs 10 face value / 100
//   gross    = units held on recordDate x per_unit
//   net      = gross - 5% TDS (final withholding, individuals)
//
// A declaration is appended here ONLY after the percentage and
// record date are verified against the sources below - same
// discipline as the tax_rules table. No guessed rows.
// ============================================================

export interface DividendDeclaration {
  /** Matches fund_config.fund_name (normalized: trim + lowercase). */
  fundName: string;
  fiscalYear: string;
  /** Percent of the Rs 10 face value, as declared. */
  dividendPct: number;
  /** Book-closure (record) date, AD "YYYY-MM-DD". */
  recordDate: string;
  officialSource: string;
  officialSourceUrl: string;
  verifiedAt: string;
}

export const DIVIDEND_DECLARATIONS: DividendDeclaration[] = [
  // ---- NIBL Sahabhagita Fund (NIMB Ace Capital) ----
  {
    fundName: "nibl sahabhagita fund",
    fiscalYear: "2077/78",
    dividendPct: 50,
    recordDate: "2021-07-29",
    officialSource: "Lagani Lab corporate actions - NIBLSF",
    officialSourceUrl: "https://laganilab.com/nepse-company/NIBLSF",
    verifiedAt: "2026-10-01",
  },
  {
    fundName: "nibl sahabhagita fund",
    fiscalYear: "2078/79",
    dividendPct: 7.2,
    recordDate: "2022-08-25",
    officialSource: "Lagani Lab corporate actions - NIBLSF",
    officialSourceUrl: "https://laganilab.com/nepse-company/NIBLSF",
    verifiedAt: "2026-10-01",
  },
  {
    fundName: "nibl sahabhagita fund",
    fiscalYear: "2079/80",
    dividendPct: 4,
    recordDate: "2023-07-27",
    officialSource: "Lagani Lab corporate actions - NIBLSF",
    officialSourceUrl: "https://laganilab.com/nepse-company/NIBLSF",
    verifiedAt: "2026-10-01",
  },
  {
    fundName: "nibl sahabhagita fund",
    fiscalYear: "2081/82",
    dividendPct: 7,
    recordDate: "2025-07-21",
    officialSource: "Lagani Lab corporate actions - NIBLSF; NIMB Ace Capital scheme page",
    officialSourceUrl: "https://laganilab.com/nepse-company/NIBLSF",
    verifiedAt: "2026-10-01",
  },

  // ---- NMB Saral Bachat Fund-E (NMB Capital) ----
  {
    fundName: "nmb saral bachat fund-e",
    fiscalYear: "2081/82",
    dividendPct: 4.27,
    recordDate: "2025-07-31",
    officialSource: "Lagani Lab corporate actions - NMBSBF; ShareSansar 2025-08-01",
    officialSourceUrl:
      "https://www.sharesansar.com/newsdetail/nmb-saral-bachat-fund-e-proposes-427-return-for-fy-208182-2025-08-01",
    verifiedAt: "2026-10-01",
  },
  {
    fundName: "nmb saral bachat fund-e",
    fiscalYear: "2082/83",
    dividendPct: 5.25,
    recordDate: "2026-08-06",
    officialSource: "Lagani Lab corporate actions - NMBSBF; ShareSansar 2026-08-07",
    officialSourceUrl:
      "https://www.sharesansar.com/newsdetail/nmb-saral-bachat-fund-e-proposes-525-return-for-fy-208283-2026-08-07",
    verifiedAt: "2026-10-01",
  },

  // ---- SSIS - Siddhartha Systematic Investment Scheme (Siddhartha Capital) ----
  {
    fundName: "ssis",
    fiscalYear: "2081/82",
    dividendPct: 8,
    recordDate: "2025-07-27",
    officialSource: "Lagani Lab corporate actions - SSIS; ShareSansar 2025-07-28",
    officialSourceUrl:
      "https://www.sharesansar.com/newsdetail/siddhartha-systematic-investment-scheme-proposes-8-cash-dividend-for-fy-208182-2025-07-28",
    verifiedAt: "2026-10-01",
  },
  {
    fundName: "ssis",
    fiscalYear: "2082/83",
    dividendPct: 3,
    recordDate: "2026-07-24",
    officialSource: "Lagani Lab corporate actions - SSIS",
    officialSourceUrl: "https://laganilab.com/nepse-company/SSIS",
    verifiedAt: "2026-10-01",
  },
];

export const normalizeFundName = (name: string) => name.trim().toLowerCase();
