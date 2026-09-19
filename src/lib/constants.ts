// ============================================================
// SahakariSIP: Constants & Fund Presets
// ============================================================

import type { FundPreset } from "./types";

// ---------- Fund presets ----------

export const FUND_PRESETS: FundPreset[] = [
  {
    name: "NMB Saral Bachat Fund-E",
    feeRate: 1.80, // Total: 1.5% management + 0.2% depository + 0.1% supervision
    feeBreakdown: {
      management: 1.50,
      depository: 0.20,
      supervision: 0.10,
    },
  },
  {
    name: "NIBL Sahabhagita Fund",
    feeRate: 1.57,
    feeBreakdown: {
      management: 1.25,
      depository: 0.20,
      supervision: 0.12,
    },
  },
  {
    name: "SSIS",
    // From scheme documents: Management 1.50% + Depository 0.20% = 1.70% total
    feeRate: 1.7,
    feeBreakdown: {
      management: 1.50,
      depository: 0.20,
      supervision: 0.0, // Supervision fee: unspecified in prospectus excerpt; placeholder 0.0
    },
  },
];

// ---------- App metadata ----------

export const DP_CHARGE = 5; // Flat Depository Participant fee per transaction

export const APP_NAME = "SahakariSIP";
export const APP_DESCRIPTION =
  "Track your Nepali mutual fund SIP investments: see your real returns, understand fee drag, and project your growth.";
export const APP_TAGLINE =
  "Enter what you actually invested. See exactly what it's worth.";

// ---------- Android app distribution ----------

// Direct-download URL for the Android APK asset on GitHub Releases.
// Pointing at the asset file (not the release page) makes the download
// buttons start the download immediately.
export const APP_DOWNLOAD_URL =
  "https://github.com/mdsamimrrza/sahakari-sip-mobile/releases/download/v1.0.0/SahakariSIP-v1.0.0.apk";

// ---------- Currency ----------

export const CURRENCY_CODE = "NPR";
export const CURRENCY_LOCALE = "en-IN"; // International grouping: 1,234,567

// ---------- SIP rules ----------

export const MIN_SIP_AMOUNT = 1000; // Minimum monthly SIP amount (NPR)

// ---------- Projection defaults ----------

export const RETURN_SCENARIOS = [8, 10, 12] as const;
export const STEP_UP_OPTIONS = [0, 5, 10, 15] as const;
export const PROJECTION_YEARS = [5, 10, 15, 20] as const;

// ---------- Validation limits ----------

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_NOTES_LENGTH = 500;
export const XIRR_MIN_ENTRIES = 3; // Show XIRR only when ≥ 3 entries

// ---------- Navigation items ----------

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" as const },
  { label: "History", href: "/history", icon: "History" as const },
  { label: "Projections", href: "/projections", icon: "TrendingUp" as const },
  { label: "Settings", href: "/settings", icon: "Settings" as const },
] as const;

// ---------- Chart colors (CSS variable references for dark mode support) ----------

export const CHART_COLORS = {
  primary: "hsl(var(--chart-primary))",
  positive: "hsl(var(--chart-positive))",
  negative: "hsl(var(--chart-negative))",
  invested: "hsl(var(--chart-invested))",
  feeDrag: "hsl(var(--chart-fee-drag))",
  grid: "hsl(var(--chart-grid))",
  text: "hsl(var(--chart-text))",
} as const;
