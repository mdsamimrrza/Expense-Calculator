# 📈 SahakariSIP — Nepali Mutual Fund & Open-Ended SIP Tracker

**SahakariSIP** is a production-grade, mobile-first web application engineered for tracking open-ended Mutual Fund Systematic Investment Plans (SIP) in Nepal. It implements Nepal-specific SEBON accounting rules — whole-unit allotment, NPR 5 DP charge deduction, SIP Rollover Wallet — and provides financial-grade analytics including Newton-Raphson XIRR, Capital Gains Tax estimation, and fee-drag modelling.

Built with Next.js 16 (App Router / Turbopack), TypeScript, Supabase (PostgreSQL + Row Level Security), Recharts, and Shadcn UI.

---

## 📋 Table of Contents

1. [Key Features](#-key-features)
2. [Nepali Mutual Fund Accounting Rules](#-nepali-mutual-fund-accounting-rules)
3. [Project Directory & File Structure](#-project-directory--file-structure)
4. [Application Routes & Endpoints](#-application-routes--endpoints)
5. [Server Actions API Reference](#-server-actions-api-reference)
6. [Database Schema & Row Level Security](#-database-schema--row-level-security)
7. [Authentication & Middleware Flow](#-authentication--middleware-flow)
8. [System Architecture & Data Flow](#-system-architecture--data-flow)
9. [Financial Calculation Algorithms](#-financial-calculation-algorithms)
10. [Zod Validation Schemas](#-zod-validation-schemas)
11. [Formatting & Display Utilities](#-formatting--display-utilities)
12. [UI Component Specifications](#-ui-component-specifications)
13. [Fund Presets & Constants](#-fund-presets--constants)
14. [CSV Bulk Import Specification](#-csv-bulk-import-specification)
15. [Environment Variables](#-environment-variables)
16. [Tech Stack & Dependencies](#-tech-stack--dependencies)
17. [Local Development Setup](#-local-development-setup)
18. [Design Decisions & Trade-offs](#-design-decisions--trade-offs)
19. [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🌟 Key Features

### Nepal-Specific SIP Accounting
- **Whole-Unit Allotment**: `Math.floor(effectiveCash / NAV)` — fractional units are not allotted per SEBON rules.
- **NPR 5 DP Charge**: Flat Depository Participant fee deducted from each deposit before unit calculation.
- **SIP Rollover Wallet Balance**: Uninvested leftover cash (deposit − units cost − DP fee) is tracked and carried forward.

### Financial Analytics Engine
- **XIRR Solver**: Newton-Raphson iterative solver for true annualised return on irregular cash flows (requires ≥ 3 entries).
- **Capital Gains Tax**: Estimates both Long-Term (7.5%, holding > 365 days) and Short-Term (10.0%, holding < 365 days) CGT per Nepal IRD rules.
- **Cumulative Fee Drag**: Illustrative chart showing how embedded management fees (~1.5% p.a.) erode returns over time.
- **SIP Streak**: Consecutive-month investment counter walking backwards from the current month.

### Dashboard & Visualisation
- Stock-market SVG line chart with circular data nodes and hover tooltips.
- Invested vs Return donut chart with absolute-centred percentage and colour-coded badges.
- Monthly contributions bar chart with clean Y-axis tick marks and dark floating tooltips.
- NAV Monitor & History line chart.
- Fee Drag cumulative area chart.

### User Experience
- **Mobile-first** bottom tab navigation with condensed fund selector.
- **Light / Dark mode** with `next-themes` and CSS variable design tokens.
- **CSV bulk import** for historical SIP entries.
- **Onboarding wizard** for first-time fund configuration.
- **20-year SIP Growth Projections** with step-up (0%, 5%, 10%, 15%) and return scenarios (8%, 10%, 12%).

---

## 🇳🇵 Nepali Mutual Fund Accounting Rules

### 1. SEBON Whole-Unit Allotment
When a monthly SIP deposit (e.g. NPR 5,000) arrives at the Merchant Bank, units cannot be allotted as arbitrary decimals:

```
Effective Cash  = max(0, Deposit − 5)          // DP charge deduction
Whole Units     = floor(Effective Cash / NAV)   // Integer units only
Unit Cost       = Whole Units × NAV
Rollover Cash   = Effective Cash − Unit Cost    // Stays in SIP Wallet
```

### 2. SIP Rollover Wallet Balance
Rollover cash accumulates across entries. On the next month's purchase:
```
Available Cash = New Deposit + Previous Rollover Balance
```
SahakariSIP computes rollover across all entries in `getDashboardData()`:
```typescript
const unallottedCash = entries.reduce((sum, e) => {
  const amt = Number(e.amount);
  const unitCost = Number(e.units) * Number(e.nav);
  const dpFee = amt >= 5 ? 5 : 0;
  return sum + Math.max(0, amt - (unitCost + dpFee));
}, 0);
```

### 3. Capital Gains Tax (Nepal IRD)
| Holding Period | Tax Rate | Applied On |
|:---|:---|:---|
| > 365 days (Long-Term) | **7.5%** | Net realised profit |
| ≤ 365 days (Short-Term) | **10.0%** | Net realised profit |

### 4. Fund Fee Structure
| Fee | Rate | Notes |
|:---|:---|:---|
| Entry Load | 0% | Free |
| Exit Load | 0% | Free (typically) |
| Management Fee | ~1.5% p.a. | Embedded in daily NAV — not charged separately |
| DP Charge | NPR 5/transaction | Flat deduction per SIP purchase |

---

## 📁 Project Directory & File Structure

```
sahakari-sip/
├── public/                                # Static assets (favicon, icons)
├── src/
│   ├── middleware.ts                      # Auth guard — protects routes, refreshes Supabase session
│   ├── app/                               # Next.js App Router
│   │   ├── layout.tsx                     # Root layout: HTML, fonts, ThemeProvider
│   │   ├── page.tsx                       # Landing page (public) with hero section
│   │   ├── globals.css                    # TailwindCSS + CSS custom properties (design tokens)
│   │   ├── (auth)/                        # Auth route group (public)
│   │   │   ├── layout.tsx                 # Auth layout wrapper with centered logo
│   │   │   ├── login/page.tsx             # Email + password sign-in form
│   │   │   └── signup/page.tsx            # Email + password registration form
│   │   ├── auth/
│   │   │   └── callback/route.ts          # Supabase OAuth/email confirmation callback
│   │   └── (app)/                         # Protected route group (requires auth)
│   │       ├── layout.tsx                 # AppShell: sidebar + header + bottom tab bar
│   │       ├── dashboard/page.tsx         # Main dashboard: hero chart, stats, charts
│   │       ├── history/page.tsx           # Purchase history table + CSV import
│   │       ├── projections/page.tsx       # 20-year compound interest projector
│   │       ├── settings/page.tsx          # Fund config management + NAV editor
│   │       └── onboarding/page.tsx        # First-time fund setup wizard
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── summary-cards.tsx          # Hero card, fund selector, stats dialog, mobile metrics
│   │   │   ├── portfolio-chart.tsx        # Stock-market SVG line chart
│   │   │   ├── invested-vs-gain-pie.tsx   # Donut chart with absolute-centred % + badges
│   │   │   ├── monthly-contributions-bar.tsx  # Bar chart with dark tooltips
│   │   │   ├── fee-drag-area.tsx          # Cumulative fee drag area chart
│   │   │   ├── latest-nav-input.tsx       # Inline popover to update today's NAV
│   │   │   └── nav-history-chart.tsx      # NAV history sparkline chart
│   │   ├── entries/
│   │   │   ├── entry-form.tsx             # Add/Edit entry modal with live units preview
│   │   │   ├── entry-table.tsx            # Data table with sorting, edit, delete
│   │   │   └── csv-import-dialog.tsx      # CSV file upload + validation modal
│   │   ├── layout/
│   │   │   ├── app-shell.tsx              # Main layout: sidebar + header + content + tab bar
│   │   │   ├── header.tsx                 # Sticky top bar: logo, theme toggle, sign out
│   │   │   ├── sidebar.tsx                # Desktop sidebar navigation
│   │   │   ├── bottom-tab-bar.tsx         # Mobile bottom navigation bar
│   │   │   └── theme-toggle.tsx           # Light/Dark mode toggle button
│   │   ├── onboarding/
│   │   │   └── fund-selector.tsx          # Fund preset picker with custom option
│   │   ├── projections/
│   │   │   ├── projection-chart.tsx       # Actual + projected growth line chart
│   │   │   └── projection-table.tsx       # Year-by-year wealth projection table
│   │   ├── settings/
│   │   │   └── fund-manager.tsx           # Fund CRUD: add, edit, delete, update NAV
│   │   ├── providers/
│   │   │   └── theme-provider.tsx         # next-themes ThemeProvider wrapper
│   │   └── ui/                            # Shadcn UI primitives
│   │       ├── button.tsx, card.tsx, dialog.tsx, input.tsx, label.tsx
│   │       ├── select.tsx, separator.tsx, tabs.tsx, toast.tsx, tooltip.tsx
│   │       └── logo.tsx                   # SahakariSIP brand logo component
│   ├── hooks/
│   │   └── use-toast.ts                   # Toast notification state hook
│   └── lib/                               # Core business logic
│       ├── actions/                       # Next.js Server Actions ("use server")
│       │   ├── auth.ts                    # signUp, signIn, signOut, forgotPassword, resetPassword
│       │   ├── dashboard.ts               # getDashboardData — single query for all dashboard data
│       │   ├── entries.ts                 # createEntry, updateEntry, deleteEntry, getEntries, importEntriesFromCsv
│       │   └── fund-config.ts             # createFundConfig, updateFundConfig, deleteFundConfig, updateLatestNav, getFundConfigs
│       ├── calculations/                  # Pure financial math functions (no side effects)
│       │   ├── xirr.ts                    # Newton-Raphson XIRR solver + buildCashFlows helper
│       │   ├── fee-drag.ts                # Cumulative fee drag calculator
│       │   ├── projections.ts             # Compound interest projector with step-up
│       │   └── streak.ts                  # SIP streak counter (consecutive months)
│       ├── schemas/                       # Zod validation schemas
│       │   ├── auth.ts                    # signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema
│       │   ├── entry.ts                   # entrySchema, csvRowSchema
│       │   └── fund-config.ts             # fundConfigSchema, updateLatestNavSchema
│       ├── supabase/                      # Supabase client factories
│       │   ├── client.ts                  # Browser-side Supabase client
│       │   ├── server.ts                  # Server-side Supabase client (cookies)
│       │   └── middleware.ts              # Middleware Supabase client
│       ├── constants.ts                   # App-wide constants, fund presets, chart colours
│       ├── format.ts                      # Currency, date, percentage, units formatters
│       ├── types.ts                       # All TypeScript interfaces and type aliases
│       └── utils.ts                       # Tailwind cn() merge helper
```

---

## 🔗 Application Routes & Endpoints

| Route | Access | Page Component | Description |
|:---|:---|:---|:---|
| `/` | Public | `app/page.tsx` | Landing page with hero, feature cards, CTA |
| `/login` | Public | `app/(auth)/login/page.tsx` | Email/password sign-in |
| `/signup` | Public | `app/(auth)/signup/page.tsx` | Email/password registration |
| `/auth/callback` | Public | `app/auth/callback/route.ts` | Supabase email confirmation / OAuth callback |
| `/dashboard` | Protected | `app/(app)/dashboard/page.tsx` | Main analytics dashboard |
| `/history` | Protected | `app/(app)/history/page.tsx` | Purchase history table + CSV import |
| `/projections` | Protected | `app/(app)/projections/page.tsx` | 20-year SIP growth projector |
| `/settings` | Protected | `app/(app)/settings/page.tsx` | Fund management + NAV updates |
| `/onboarding` | Protected | `app/(app)/onboarding/page.tsx` | First-time fund setup wizard |

---

## ⚡ Server Actions API Reference

All server actions use the `"use server"` directive and return `ActionResult<T>`:
```typescript
interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### `auth.ts` — Authentication
| Function | Params | Returns | Description |
|:---|:---|:---|:---|
| `signUp(formData)` | email, password, confirmPassword | `ActionResult` | Creates account via Supabase Auth |
| `signIn(formData)` | email, password | redirects | Authenticates → redirects to `/onboarding` or `/dashboard` |
| `signOut()` | — | redirects | Signs out → redirects to `/login` |
| `forgotPassword(formData)` | email | `ActionResult` | Sends password reset email |
| `resetPassword(formData)` | password, confirmPassword | redirects | Updates password → redirects to `/login` |

### `dashboard.ts` — Dashboard Data
| Function | Params | Returns | Description |
|:---|:---|:---|:---|
| `getDashboardData(fundId?)` | optional fund UUID or `"all"` | `ActionResult<DashboardData>` | Single aggregation query: summary metrics, 5 chart datasets, entries list |

**`DashboardData` response shape:**
```typescript
{
  summary: DashboardSummary;     // totalInvested, totalUnits, currentValue, unallottedCash,
                                  // gainLoss, gainLossPct, estimatedCgtLongTerm, estimatedCgtShortTerm,
                                  // xirr, sipStreak, latestNav, latestNavDate
  funds: FundConfig[];            // All active fund configurations
  portfolioChart: PortfolioChartPoint[];     // Cumulative portfolio value over time
  monthlyContributions: MonthlyContribution[]; // Monthly SIP totals
  navHistory: ChartDataPoint[];   // NAV price at each purchase date
  feeDragChart: FeeDragPoint[];   // Cumulative fee drag data
  entries: Entry[];               // All raw entries (sorted by date)
}
```

### `entries.ts` — SIP Entry CRUD
| Function | Params | Returns | Description |
|:---|:---|:---|:---|
| `createEntry(formData)` | fund_id, purchase_date, amount, nav, units, notes | `ActionResult<Entry>` | Validates with Zod → inserts entry → revalidates `/dashboard` and `/history` |
| `updateEntry(id, formData)` | Same as create | `ActionResult<Entry>` | Updates existing entry |
| `deleteEntry(id)` | entry UUID | `ActionResult` | Deletes entry (RLS enforced) |
| `getEntries(params?)` | fundId, page, pageSize, sortOrder | `ActionResult<{entries, total}>` | Paginated entry query |
| `importEntriesFromCsv(fundId, rows)` | fund UUID, CSV row array | `ActionResult<CsvImportResult>` | Batch imports with per-row error tracking |

### `fund-config.ts` — Fund Management
| Function | Params | Returns | Description |
|:---|:---|:---|:---|
| `createFundConfig(formData)` | fund_name, fee_rate_pct, start_date, monthly_sip | `ActionResult<FundConfig>` | Creates a new fund |
| `updateFundConfig(id, formData)` | Same as create | `ActionResult<FundConfig>` | Updates existing fund |
| `deleteFundConfig(id)` | fund UUID | `ActionResult` | Blocks deletion if entries exist |
| `updateLatestNav(formData)` | fund_id, latest_nav, latest_nav_date | `ActionResult` | Updates current NAV price |
| `getFundConfigs()` | — | `ActionResult<FundConfig[]>` | Lists all active funds |

---

## 🗄️ Database Schema & Row Level Security

### `fund_config` Table
```sql
CREATE TABLE public.fund_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    fund_name TEXT NOT NULL,
    fee_rate_pct NUMERIC NOT NULL DEFAULT 1.5,
    start_date DATE NOT NULL,
    monthly_sip NUMERIC NOT NULL DEFAULT 5000,
    latest_nav NUMERIC,
    latest_nav_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.fund_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own funds" ON public.fund_config
    FOR ALL USING (auth.uid() = user_id);
```

### `entries` Table
```sql
CREATE TABLE public.entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    fund_id UUID REFERENCES public.fund_config(id) ON DELETE CASCADE NOT NULL,
    purchase_date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    nav NUMERIC NOT NULL,
    units NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own entries" ON public.entries
    FOR ALL USING (auth.uid() = user_id);
```

### `nav_history` Table
```sql
CREATE TABLE public.nav_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fund_id UUID REFERENCES public.fund_config(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    nav_date DATE NOT NULL,
    nav_value NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(fund_id, nav_date)
);

ALTER TABLE public.nav_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own nav history" ON public.nav_history
    FOR ALL USING (auth.uid() = user_id);
```

### `user_roles` Table (Server-Controlled RBAC)
```sql
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);
```

> **Security**: Every table uses Row Level Security (RLS). Users can only read/write rows where `user_id = auth.uid()`. No admin bypass exists. The Supabase anon key has no elevated privileges.

---

## 🔒 Authentication & Middleware Flow

```
Browser Request
    │
    ▼
middleware.ts
    ├── Creates Supabase SSR client (cookie-based)
    ├── Calls supabase.auth.getUser() to refresh session
    ├── If route is PROTECTED (/dashboard, /history, /projections, /settings, /onboarding)
    │   └── No user → redirect to /login?redirect={path}
    ├── If route is AUTH (/login, /signup)
    │   └── Has user → redirect to /dashboard
    └── Otherwise → pass through
```

**Matched paths** (excludes static assets):
```typescript
matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
```

**Post-login onboarding check** (in `signIn` server action):
```typescript
const { data: funds } = await supabase.from("fund_config").select("id").limit(1);
if (!funds || funds.length === 0) redirect("/onboarding");
else redirect("/dashboard");
```

---

## 🔄 System Architecture & Data Flow

```
┌──────────────────┐     Form Submit / useEffect      ┌─────────────────────┐
│   React Client   │ ─────────────────────────────────▶ │   Server Action     │
│   (Components)   │                                    │   ("use server")    │
└──────────────────┘                                    └──────────┬──────────┘
        ▲                                                          │
        │                                               Zod Validation
        │                                                          │
        │                                                          ▼
        │                                               ┌─────────────────────┐
        │                                               │  Supabase Client    │
        │                                               │  (server.ts)        │
        │                                               └──────────┬──────────┘
        │                                                          │
        │                                                  SQL + RLS Filter
        │                                                          │
        │                                                          ▼
        │                                               ┌─────────────────────┐
        │                                               │  PostgreSQL (RLS)   │
        │                                               │  fund_config        │
        │                                               │  entries            │
        │                                               └──────────┬──────────┘
        │                                                          │
        │                                                    Raw Data
        │                                                          │
        │                                                          ▼
        │                                               ┌─────────────────────┐
        │                                               │ Calculation Engine  │
        │          ActionResult<DashboardData>           │  xirr.ts            │
        └───────────────────────────────────────────────│  fee-drag.ts        │
                                                        │  streak.ts          │
                                                        │  projections.ts     │
                                                        └─────────────────────┘
```

---

## 🧮 Financial Calculation Algorithms

### 1. XIRR — Newton-Raphson Solver (`xirr.ts`)

Solves for rate $r$ such that NPV = 0:

$$\text{NPV}(r) = \sum_{i=1}^{n} \frac{CF_i}{(1 + r)^{d_i / 365}} = 0$$

```typescript
// Newton-Raphson iteration (MAX_ITERATIONS = 100, TOLERANCE = 1e-7)
let rate = 0.1; // Initial guess: 10%
for (let i = 0; i < MAX_ITERATIONS; i++) {
  const f = npv(rate);           // Σ CFᵢ / (1+r)^(dᵢ/365)
  const fPrime = npvDerivative(rate); // Σ -(dᵢ/365) × CFᵢ / (1+r)^(dᵢ/365 + 1)
  if (Math.abs(fPrime) < 1e-12) { rate += 0.1; continue; }
  const newRate = rate - f / fPrime;
  if (Math.abs(newRate - rate) < TOLERANCE) return newRate; // Converged
  rate = newRate;
}
```

**Cash flow construction** (`buildCashFlows`):
- Each SIP entry → negative cash flow: `-(amount + DP_CHARGE)`
- Current portfolio value → positive cash flow on today's date

**Guard rails**: Rejects results outside `(-1, 10)` range (i.e. -100% to +1000%).

### 2. Cumulative Fee Drag (`fee-drag.ts`)

The management fee is **embedded** in the published NAV (not charged separately). This calculator is **illustrative** — it shows what the fee looks like as a standalone deduction:

```typescript
monthlyRate = feeRatePct / 100 / 12
corpusValue = cumulativeUnits × NAV
monthlyDrag = corpusValue × monthlyRate
cumulativeDrag += monthlyDrag  // Running sum
```

### 3. SIP Growth Projections (`projections.ts`)

Monthly compounding with optional annual step-up:

```typescript
for (let month = 1; month <= totalMonths; month++) {
  // Step-up every 12 months
  if (stepUpPct > 0 && month > 1 && (month - 1) % 12 === 0) {
    currentMonthlySip *= (1 + stepUpPct / 100);
  }
  corpus = corpus * (1 + monthlyRate) + currentMonthlySip;
}
```

**Key design**: Projections are **seeded** with the current portfolio value (not zero), so they continue from where real data ends.

**Starting corpus logic** (`projections/page.tsx`):
```typescript
// Uses Units × NAV (not total balance) to exclude uninvested wallet cash
const unitsVal = summary.totalUnits > 0 && summary.latestNav
  ? summary.totalUnits * summary.latestNav
  : summary.totalInvested || 0;
```

### 4. SIP Streak Counter (`streak.ts`)

Counts consecutive calendar months with ≥ 1 entry, walking backwards from the current month:

```typescript
for (let i = 0; i < 120; i++) { // Max 10 years back
  const monthKey = format(checkDate, "yyyy-MM");
  if (monthsWithEntries.has(monthKey)) {
    streak++;
    checkDate = subMonths(checkDate, 1);
  } else break;
}
```

---

## 🔍 Zod Validation Schemas

### Entry Schema (`schemas/entry.ts`)
```typescript
entrySchema = z.object({
  fund_id:       z.string().uuid("Please select a fund"),
  purchase_date: z.coerce.date().refine(d => d <= new Date(), "Cannot be future"),
  amount:        z.number().positive("Must be > 0"),
  nav:           z.number().positive("Must be > 0"),
  units:         z.number().positive("Must be > 0"),
  notes:         z.string().max(500).optional(),
});
```

### CSV Row Schema (`schemas/entry.ts`)
```typescript
csvRowSchema = z.object({
  date:   z.string().refine(val => !isNaN(new Date(val).getTime()) && new Date(val) <= new Date()),
  amount: z.coerce.number().positive(),
  nav:    z.coerce.number().positive(),
  units:  z.coerce.number().positive().optional(), // Auto-calculated if omitted
  notes:  z.string().max(500).optional(),
});
```

### Auth Schemas (`schemas/auth.ts`)
- `signupSchema`: email + password (min 8 chars) + confirmPassword (must match)
- `loginSchema`: email + password
- `forgotPasswordSchema`: email
- `resetPasswordSchema`: password + confirmPassword

### Fund Config Schema (`schemas/fund-config.ts`)
- `fundConfigSchema`: fund_name, fee_rate_pct, start_date, monthly_sip
- `updateLatestNavSchema`: fund_id (UUID), latest_nav (positive number), latest_nav_date

---

## 🎨 Formatting & Display Utilities (`format.ts`)

| Function | Input | Output | Example |
|:---|:---|:---|:---|
| `formatCurrency(value, showSign?)` | `1234.56` | `"NPR 1,234.56"` | Full precision with locale |
| `formatCurrencyWhole(value, showSign?)` | `1234` | `"NPR 1,234"` | No decimals for summary cards |
| `formatPercentage(value, showSign?)` | `12.345` | `"+12.35%"` | 2 decimal places with sign |
| `formatUnits(value)` | `495.1234` | `"495.1234"` | 4 decimal places (MF standard) |
| `formatNav(value)` | `10.08` | `"10.08"` | 2 decimal places |
| `formatDate(dateStr)` | `"2026-03-15"` | `"Mar 15, 2026"` | Display dates |
| `formatDateShort(dateStr)` | `"2026-03-15"` | `"Mar '26"` | Chart axis labels |
| `formatRelativeDate(dateStr)` | `"2026-08-09"` | `"2 days ago"` | Relative time display |
| `formatMonth(monthKey)` | `"2026-03"` | `"Mar 2026"` | Monthly chart labels |
| `formatStreak(months)` | `14` | `"14 months 🔥"` | ≥ 3 months adds fire emoji |

---

## 🧩 UI Component Specifications

### Dashboard (`components/dashboard/`)

| Component | Purpose | Key Features |
|:---|:---|:---|
| `SummaryCards` | Hero card + metrics | Mobile: condensed fund selector, quick Add SIP button, portfolio summary dialog with CGT table. Desktop: 6-card grid |
| `PortfolioChart` | Portfolio value over time | SVG line chart with circular data nodes, hover tooltips |
| `InvestedVsGainPie` | Investment vs return split | Donut chart with absolute-centred profit %, colour-coded legend badges |
| `MonthlyContributionsBar` | Monthly SIP amounts | Bar chart with `cursor={false}`, dark `bg-slate-900` floating tooltips |
| `FeeDragArea` | Cumulative fee impact | Area chart showing management fee erosion |
| `LatestNavInput` | Inline NAV editor | Popover form with date picker; calls `updateLatestNav` server action |

### Layout (`components/layout/`)

| Component | Purpose |
|:---|:---|
| `AppShell` | Main wrapper: sidebar (desktop) + header + content + bottom tab bar (mobile) |
| `Header` | Sticky top bar with `Logo`, `ThemeToggle`, sign-out button |
| `Sidebar` | Desktop-only navigation with icons and active-state highlighting |
| `BottomTabBar` | Mobile-only 4-tab navigation: Dashboard, History, Projections, Settings |

---

## 📦 Fund Presets & Constants (`constants.ts`)

### Pre-configured Fund Presets
```typescript
FUND_PRESETS = [
  { name: "NMB Saral Bachat Fund-E", feeRate: 1.80,
    feeBreakdown: { management: 1.50, depository: 0.20, supervision: 0.10 } },
  { name: "NIBL Sahabhagita Fund",   feeRate: 1.57 },
  { name: "SSIS",                     feeRate: 1.50 },
];
```

### System Constants
| Constant | Value | Purpose |
|:---|:---|:---|
| `DP_CHARGE` | `5` | NPR 5 flat fee per transaction |
| `CURRENCY_CODE` | `"NPR"` | Nepalese Rupee |
| `CURRENCY_LOCALE` | `"en-IN"` | International digit grouping (1,234,567) |
| `XIRR_MIN_ENTRIES` | `3` | Minimum entries before showing XIRR |
| `MIN_PASSWORD_LENGTH` | `8` | Auth password requirement |
| `MAX_NOTES_LENGTH` | `500` | Entry notes character limit |
| `RETURN_SCENARIOS` | `[8, 10, 12]` | Projection return options (%) |
| `STEP_UP_OPTIONS` | `[0, 5, 10, 15]` | Annual SIP step-up options (%) |
| `PROJECTION_YEARS` | `[5, 10, 15, 20]` | Projection year milestones |

---

## 📂 CSV Bulk Import Specification

Upload CSV files on the **History** page (`/history`) via the "Import CSV" button.

### Required Format
```csv
date,amount,nav,units,notes
2026-01-15,5000,10.00,495,First SIP deposit
2026-02-15,5000,10.08,495,Second month SIP
```

### Column Rules
| Column | Required | Type | Notes |
|:---|:---|:---|:---|
| `date` | ✅ | ISO date string | Cannot be in the future |
| `amount` | ✅ | Positive number | SIP deposit amount (NPR) |
| `nav` | ✅ | Positive number | NAV at purchase date |
| `units` | ❌ | Positive number | Auto-calculated as `amount / nav` if omitted |
| `notes` | ❌ | String (max 500) | Optional description |

**Import result** returns `{ imported, skipped, errors: [{row, message}] }` for transparency.

---

## 🔐 Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key
```

| Variable | Required | Description |
|:---|:---|:---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase public anon key (RLS-protected) |

> Both variables are prefixed with `NEXT_PUBLIC_` so they are available on both server and client. Security is enforced by PostgreSQL Row Level Security, not by hiding the key.

---

## 🛠️ Tech Stack & Dependencies

### Core
| Technology | Version | Purpose |
|:---|:---|:---|
| Next.js | 16.3.0 | Framework (App Router, Turbopack) |
| React | 19.2.8 | UI library |
| TypeScript | 5.x | Type safety |

### Backend & Data
| Technology | Version | Purpose |
|:---|:---|:---|
| Supabase JS | 2.112.2 | Database client & auth |
| Supabase SSR | 0.12.4 | Server-side cookie-based auth |
| Zod | 3.25.76 | Runtime schema validation |

### UI & Styling
| Technology | Version | Purpose |
|:---|:---|:---|
| TailwindCSS | 3.4.1 | Utility-first CSS |
| Shadcn UI | (Radix primitives) | Accessible UI components |
| Lucide React | 1.31.0 | Icon library |
| next-themes | 0.4.6 | Dark/Light mode |

### Data Visualisation
| Technology | Version | Purpose |
|:---|:---|:---|
| Recharts | 3.10.1 | Charts (bar, line, pie, area) |

### Forms & Utilities
| Technology | Version | Purpose |
|:---|:---|:---|
| React Hook Form | 7.85.0 | Form state management |
| date-fns | 4.4.0 | Date formatting & math |
| clsx + tailwind-merge | latest | Conditional class composition |

---

## 🚀 Local Development Setup

```bash
# 1. Clone
git clone https://github.com/mdsamimrrza/Expense-Calculator.git
cd sahakari-sip

# 2. Install
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Run development server
npm run dev
# → http://localhost:3000

# 5. Build for production
npm run build

# 6. Start production server
npm start

# 7. Lint
npm run lint
```

---

## 🏗️ Design Decisions & Trade-offs

### 1. Single `getDashboardData()` query instead of multiple endpoints
All dashboard metrics, chart data, and entries are fetched in a single server action. This simplifies client state management and eliminates waterfall requests, at the cost of a larger response payload.

### 2. Calculations on the server, not the client
XIRR, fee drag, streak, and rollover cash are all computed server-side in the dashboard action. This keeps the client bundle small and ensures consistent results regardless of browser.

### 3. Fund fee embedded in NAV, fee drag is illustrative only
Nepal mutual fund management fees are already reflected in the daily published NAV. The fee drag chart is a **teaching tool** to help investors understand the hidden cost — it does not represent an actual charge.

### 4. Whole units only, no fractional allotment
Per SEBON regulations, Nepal mutual funds allot integer units. The app enforces `Math.floor()` and tracks leftover cash in the Rollover Wallet. This differs from Indian mutual funds which allow 4-decimal fractional units.

### 5. XIRR requires ≥ 3 entries
With fewer than 3 data points, the Newton-Raphson solver produces unreliable or meaningless results. The app displays "Not enough data" instead.

### 6. Projections seeded from Units × NAV, not Total Balance
To avoid inflating projections with uninvested rollover wallet cash, the starting corpus for projections uses `totalUnits × latestNAV` rather than `currentValue` (which includes the wallet).

---

## ❓ Troubleshooting & FAQ

### Why does Total Balance differ from Total Units × NAV?
Total Balance = (Units × NAV) + Uninvested SIP Rollover Wallet Cash. The wallet holds leftover money from whole-unit rounding and accumulates across purchases.

### Why does XIRR show "Not enough data"?
XIRR requires at minimum 3 SIP entries with both positive (current value) and negative (investments) cash flows. Add more entries or set the current NAV.

### How do I update today's NAV?
**Mobile**: Tap the pencil icon on the Fund NAV bar on the dashboard.
**Desktop**: Go to Settings → click "Update NAV" on your fund card.
The NAV is stored on the `fund_config` table and instantly recalculates all derived metrics.

### Why can't I delete a fund?
Funds with existing entries cannot be deleted. Delete all entries for that fund first, then delete the fund configuration.

### Why does the projection starting corpus differ from my dashboard balance?
Projections use **Units × NAV** (pure mutual fund value), excluding rollover wallet cash. This prevents uninvested cash from being compounded at market returns.

---

## 📝 License

MIT License. Built with ❤️ for Mutual Fund SIP investors in Nepal.
