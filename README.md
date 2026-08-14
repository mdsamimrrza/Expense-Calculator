# 📈 SahakariSIP — Nepali Mutual Fund & Open-Ended SIP Tracker

**SahakariSIP** is a production-grade, mobile-first web application engineered for tracking open-ended Mutual Fund Systematic Investment Plans (SIP) in Nepal. It implements Nepal-specific SEBON accounting rules — whole-unit allotment, NPR 5 DP charge deduction, SIP Rollover Wallet — and provides financial-grade analytics including Newton-Raphson XIRR, Capital Gains Tax estimation, and fee-drag modelling.

Built with **Next.js 16 (App Router / Turbopack)**, **TypeScript**, **NextAuth v5 (Auth.js)**, **Supabase (PostgreSQL + Row Level Security)**, **Nodemailer**, **Recharts**, and **Shadcn UI**.

---

## 📋 Table of Contents

1. [Key Features](#-key-features)
2. [Nepali Mutual Fund Accounting Rules](#-nepali-mutual-fund-accounting-rules)
3. [Project Directory & File Structure](#-project-directory--file-structure)
4. [Application Routes & Endpoints](#-application-routes--endpoints)
5. [Server Actions API Reference](#-server-actions-api-reference)
6. [Authentication, Security & Rate Limiting](#-authentication-security--rate-limiting)
7. [Database Schema & Row Level Security](#-database-schema--row-level-security)
8. [System Architecture & Data Flow](#-system-architecture--data-flow)
9. [Financial Calculation Algorithms](#-financial-calculation-algorithms)
10. [Zod Validation Schemas](#-zod-validation-schemas)
11. [Formatting & Display Utilities](#-formatting--display-utilities)
12. [UI Component Specifications](#-ui-component-specifications)
13. [Fund Presets & Constants](#-fund-presets--constants)
14. [CSV Bulk Import Specification](#-csv-bulk-import-specification)
15. [Environment Variables & Live Deployment](#-environment-variables--live-deployment)
16. [Tech Stack & Dependencies](#-tech-stack--dependencies)
17. [Local Development Setup](#-local-development-setup)
18. [Design Decisions & Trade-offs](#-design-decisions--trade-offs)
19. [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🌟 Key Features

### 🇳🇵 Nepal-Specific SIP Accounting
- **Whole-Unit Allotment**: `Math.floor(effectiveCash / NAV)` — fractional units are not allotted per SEBON rules.
- **NPR 5 DP Charge**: Flat Depository Participant fee deducted from each deposit before unit calculation.
- **SIP Rollover Wallet Balance**: Uninvested leftover cash (deposit − units cost − DP fee) is tracked and carried forward.

### 📊 Financial Analytics & Audit Engine
- **XIRR Solver**: Newton-Raphson iterative solver for true annualised return on irregular cash flows (requires ≥ 3 entries).
- **Tax & Settlement Ledger (`/tax-breakdown`)**: Complete 5-part breakdown of gross deposits, SEBON DP charges, embedded AMC management fee drag, capital gains tax, and net bank payout.
- **Capital Gains Tax**: Estimates both Long-Term (7.5%, holding > 365 days) and Short-Term (10.0%, holding ≤ 365 days) CGT per Nepal IRD rules.
- **Cumulative Fee Drag**: Illustrative chart showing how embedded management fees (~1.5% p.a.) erode returns over time.
- **SIP Streak**: Consecutive-month investment counter walking backwards from the current month.

### 🎴 Cross-Device User Avatar & Profile Card (`UserAvatarMenu`)
- **Initial Avatar Circle**: Capitalized initial avatar (`S` / `M`) styled in Theme-Aware Emerald.
- **Session Active Timestamp**: Displays security badge **`SESSION ACTIVE SINCE`** (`Aug 14 at 05:14 PM`).
- **Responsive Layout**: Renders as a compact initial badge in mobile header, and as a full profile card in desktop sidebar.
- **Quick Controls**: Instant navigation to Settings and direct Log Out button.

### 🔒 NextAuth & Security Shield
- **NextAuth v5 (Auth.js)**: Supports Google OAuth 2.0 and Nodemailer Magic Link Passwordless Sign-In.
- **Custom Branded HTML Email Template**: Dark slate HTML email with glowing logo, action CTA button, and expiration notices.
- **30-Minute Magic Link Expiration**: `maxAge: 30 * 60` enforces strict 30-minute validity on sign-in email links.
- **Sliding-Window Email Rate Limiter**: Enforces max **5 email requests per hour** per email/IP to prevent spam & abuse.

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
| DP Charge | NPR 5 | Deducted per transaction |

---

## 📁 Project Directory & File Structure

```
sahakari-sip_old/
├── src/
│   ├── app/
│   │   ├── (app)/                       # Authenticated Protected App Shell
│   │   │   ├── dashboard/page.tsx       # Main Portfolio Dashboard & Charts
│   │   │   ├── history/page.tsx         # Transaction History Ledger & CSV Import
│   │   │   ├── onboarding/page.tsx      # First-Time Fund Setup Wizard
│   │   │   ├── projections/page.tsx     # 20-Year SIP Growth Projection Engine
│   │   │   ├── settings/page.tsx        # Responsive 2-Column Fund & User Settings
│   │   │   ├── tax-breakdown/page.tsx   # Tax & Settlement Ledger View
│   │   │   └── layout.tsx               # App Session & Shell Provider
│   │   ├── (auth)/                      # Public Auth Routes
│   │   │   ├── login/page.tsx           # Login Screen (Google + Magic Link)
│   │   │   ├── signup/page.tsx          # Signup Screen
│   │   │   ├── forgot-password/page.tsx # Password Reset Request
│   │   │   └── reset-password/page.tsx  # New Password Form
│   │   ├── api/auth/[...nextauth]/      # NextAuth Route Handler
│   │   ├── manifest.ts                  # Web App Manifest
│   │   └── layout.tsx                   # Global Root Layout & Theme Provider
│   ├── components/
│   │   ├── auth/                        # Google Button & Auth Forms
│   │   ├── dashboard/                   # Portfolio Cards, NAV Input & Recharts
│   │   ├── entries/                     # Transaction Table & Fund Selector
│   │   ├── layout/                      # AppShell, Header, Sidebar, UserAvatarMenu
│   │   ├── onboarding/                  # Step-by-Step Fund Wizard
│   │   ├── projections/                 # Step-Up & Scenario Selector
│   │   ├── providers/                   # ThemeProvider & SessionProvider
│   │   ├── settings/                    # FundConfigForm (Search & Pagination), DeleteAccount
│   │   ├── tax/                         # TaxBreakdownView (5-Section Audit Table)
│   │   └── ui/                          # Shadcn UI Design Tokens & Components
│   ├── lib/
│   │   ├── actions/                     # Server Actions (auth, dashboard, entries, fund-config)
│   │   ├── calculations/                # XIRR, CGT, Fee Drag & Financial Algorithms
│   │   ├── rate-limit.ts                # Sliding Window Email Rate Limiter
│   │   ├── format.ts                    # Nepali Currency & Date Formatters
│   │   ├── constants.ts                 # Preset Nepali Open-Ended Mutual Funds
│   │   ├── types.ts                     # TypeScript Interfaces & Data Models
│   │   └── supabase/                    # Supabase Client & Server Utilities
│   ├── auth.ts                          # NextAuth Engine, Nodemailer Custom HTML, SupabaseAdapter
│   ├── auth.config.ts                   # Auth Middleware Configuration
│   └── middleware.ts                    # Protected Route Guard
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql       # Initial Postgres Tables & RLS Policies
│       └── 002_nextauth_migration.sql   # NextAuth Schema & Supabase Integration
├── .env.local.example                   # Environment Variable Template
├── package.json                         # Dependencies & Scripts
├── tailwind.config.ts                   # Tailwind CSS Theme & JIT Setup
└── tsconfig.json                        # TypeScript Configuration
```

---

## 🌐 Application Routes & Endpoints

| Route | Auth Required | Purpose |
|:---|:---:|:---|
| `/login` | No | User login via Google OAuth or Magic Link |
| `/signup` | No | New user account creation |
| `/forgot-password` | No | Request password reset email |
| `/reset-password` | No | Submit new password |
| `/dashboard` | **Yes** | Portfolio metrics, NAV edit pill, charts & fund filter |
| `/history` | **Yes** | Complete transaction table, CSV bulk import, entry editor |
| `/projections` | **Yes** | 20-year SIP growth calculator with step-up & return scenarios |
| `/tax-breakdown` | **Yes** | Tax audit, gross deposits, SEBON fees, CGT, net bank payout |
| `/settings` | **Yes** | 2-column responsive layout, fund manager, search & pagination, profile card |
| `/onboarding` | **Yes** | First-time fund configuration wizard |

---

## ⚡ Server Actions API Reference

### Auth Actions (`src/lib/actions/auth.ts`)
* `signOutAction()`: Signs out the current user session.
* `forgotPassword(formData)`: Validates email rate limit (max 5/hr) and triggers password reset workflow.
* `deleteAccount()`: Permanently deletes user account and cascading data.

### Dashboard Actions (`src/lib/actions/dashboard.ts`)
* `getDashboardData(fundId?)`: Fetches funds, entries, current NAV, computes XIRR, CGT, streak, rollover cash, and chart time-series.
* `updateLatestNav(fundId, nav)`: Updates latest NAV for a fund and revalidates `/dashboard`, `/history`, `/settings`.

### Entry Actions (`src/lib/actions/entries.ts`)
* `createEntry(data)`: Creates a single SIP transaction entry with whole units calculation.
* `createBulkEntries(fundId, entries)`: Batch inserts CSV parsed entries.
* `updateEntry(id, data)`: Modifies an existing SIP entry.
* `deleteEntry(id)`: Removes a transaction entry.

### Fund Config Actions (`src/lib/actions/fund-config.ts`)
* `createFundConfig(data)`: Configures a new mutual fund tracking instance.
* `updateFundConfig(id, data)`: Edits fee percentage, monthly SIP target, or NAV.
* `deleteFundConfig(id)`: Removes fund config (only if zero entries exist).

---

## 🔒 Authentication, Security & Rate Limiting

### 1. NextAuth v5 Architecture
* **Auth Providers**: Google OAuth 2.0 + Nodemailer Passwordless Email Magic Links.
* **SupabaseAdapter**: Syncs user profiles, accounts, sessions, and verification tokens directly into Supabase (`next_auth` schema).
* **Build-Time Resilience**: Includes fallback placeholders to guarantee 100% clean static builds on Vercel even before environment variables are injected.

### 2. Custom Branded HTML Email Template
Nodemailer sends a dark-theme, responsive HTML email featuring:
* Glowing **📊 SahakariSIP** logo header.
* Clear **`Sign in to SahakariSIP →`** action button.
* Explicit security notice: **`⏱️ This sign-in link is valid for 30 minutes only.`**

### 3. Magic Link Expiration
* Configured with `maxAge: 30 * 60` (1,800 seconds). Magic link tokens expire strictly after **30 minutes** and are single-use.

### 4. Sliding-Window Email Rate Limiter (`src/lib/rate-limit.ts`)
* Restricts email verification & password reset requests to **maximum 5 emails per hour** per email address/IP to prevent spam, abuse, and SMTP exhaustion.

---

## 🗄️ Database Schema & Row Level Security

### `public.fund_config` Table
```sql
CREATE TABLE public.fund_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fund_name TEXT NOT NULL,
    fee_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 1.50,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    monthly_sip NUMERIC(12,2) NOT NULL DEFAULT 5000.00,
    latest_nav NUMERIC(8,4),
    nav_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fund_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own fund configs"
ON public.fund_config FOR ALL
USING (auth.uid() = user_id);
```

### `public.sip_entries` Table
```sql
CREATE TABLE public.sip_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fund_id UUID NOT NULL REFERENCES public.fund_config(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    nav NUMERIC(8,4) NOT NULL CHECK (nav > 0),
    units NUMERIC(12,4) NOT NULL CHECK (units >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sip_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sip entries"
ON public.sip_entries FOR ALL
USING (auth.uid() = user_id);
```

---

## 🏗️ System Architecture & Data Flow

```
[ Client Browser ]
       │
       ▼  (Server Actions / HTTP)
[ Next.js 16 App Router Server ]
       │
       ├────► [ NextAuth v5 Middleware Guard ]
       │
       ├────► [ Newton-Raphson XIRR & Analytics Engine ]
       │
       └────► [ Supabase PostgreSQL DB ]
                     │ (Row Level Security)
                     └────► public.fund_config
                     └────► public.sip_entries
                     └────► next_auth.users
```

---

## 🧮 Financial Calculation Algorithms

### 1. Newton-Raphson XIRR Solver (`src/lib/calculations/xirr.ts`)
Calculates the exact Internal Rate of Return ($r$) solving:
$$f(r) = \sum_{i=1}^{n} P_i \cdot (1 + r)^{-\frac{d_i - d_0}{365}} = 0$$

Uses first derivative $f'(r)$ for rapid convergence in under 100 iterations.

### 2. Capital Gains Tax Estimator (`src/lib/calculations/tax.ts`)
* Evaluates purchase date vs liquidation date for each entry.
* If holding duration $> 365$ days $\rightarrow$ **7.5% Long-Term CGT**.
* If holding duration $\le 365$ days $\rightarrow$ **10.0% Short-Term CGT**.

---

## 📝 Zod Validation Schemas (`src/lib/schemas/`)

* `sipEntrySchema`: Validates entry date, deposit amount ($> 0$), NAV ($> 0$), and optional units override.
* `fundConfigSchema`: Validates fund name, annual fee % ($0.1\% - 5.0\%$), monthly SIP target ($> 0$), start date, and latest NAV.
* `forgotPasswordSchema`: Validates email string format and rate limits.

---

## 🎨 Formatting & Display Utilities (`src/lib/format.ts`)

* `formatCurrency(val)`: Formats numbers as NPR currency with decimals (`NPR 5,000.00`).
* `formatCurrencyWhole(val)`: Formats currency without decimals (`NPR 5,000`).
* `formatDate(dateStr)`: Formats ISO dates into clean readable strings (`Aug 14, 2026`).

---

## 🧩 UI Component Specifications

* **`<UserAvatarMenu />`**: Cross-device avatar pill & profile card with session timestamp badge.
* **`<FundConfigForm />`**: Responsive 2-column card with search filter and 5-item client-side pagination.
* **`<SummaryCards />`**: 4 top metric cards including Portfolio Value, Total Investment, Net Returns, and XIRR.
* **`<TaxBreakdownView />`**: 5-section audit table for deposits, SEBON fees, AMC charges, CGT, and net payout.

---

## 🏛️ Fund Presets & Constants (`src/lib/constants.ts`)

Includes pre-configured open-ended mutual funds in Nepal:
* NIBL Sahabhagita Fund (NIBLSF)
* NMB Saral Bachat Fund E (NMBSBF)
* NIC Asia Dynamic Debt Fund (NADDF)
* Siddhartha Systematic Investment Scheme (SSIS)
* Laxmi Unnati Kosh (LUK)

---

## 📄 CSV Bulk Import Specification

Users can upload CSV files on `/history` formatted as:

```csv
date,amount,nav
2024-01-15,5000,10.25
2024-02-15,5000,10.40
2024-03-15,5000,10.15
```

The app parses the file, calculates whole units per row, and bulk inserts into Supabase.

---

## ⚙️ Environment Variables & Live Deployment

### `.env` / `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

AUTH_SECRET=your-32-byte-hex-secret
NEXTAUTH_URL=https://expense-calculator-taupe.vercel.app

AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

---

## 📦 Tech Stack & Dependencies

* **Framework**: Next.js 16.3.0 (App Router, Turbopack)
* **Language**: TypeScript 5.x
* **Authentication**: NextAuth.js v5 (Auth.js) + Nodemailer + Google Provider
* **Database & Auth**: Supabase PostgreSQL + `@auth/supabase-adapter`
* **Styling**: Tailwind CSS v3.4 + Shadcn UI + Lucide Icons
* **Charts**: Recharts
* **Form Validation**: Zod + React Hook Form

---

## 🛠️ Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/mdsamimrrza/Expense-Calculator.git
cd Expense-Calculator

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.local.example .env.local

# 4. Start local development server
npm run dev

# 5. Build verification
npm run build
```

---

## 🏗️ Design Decisions & Trade-offs

1. **Single `getDashboardData()` query**: All metrics and entries fetched in one server action to eliminate client waterfalls.
2. **Server-side financial calculations**: XIRR, fee drag, streak, and rollover cash computed on server for consistent precision.
3. **SEBON Whole-Unit Rule**: Enforces `Math.floor()` for units and carries leftover cash in SIP Rollover Wallet.

---

## ❓ Troubleshooting & FAQ

### Why does Total Balance differ from Total Units × NAV?
Total Balance = (Units × NAV) + Uninvested SIP Rollover Wallet Cash.

### Why does XIRR show "Not enough data"?
XIRR requires at minimum 3 SIP entries with both positive and negative cash flows.

### How long is the email sign-in link valid?
Magic email sign-in links are single-use and expire after **30 minutes**.

---

## 📝 License

MIT License. Engineered with ❤️ for Mutual Fund SIP investors in Nepal.
