# SahakariSIP — Task Tracker

## Phase 1 — Project Scaffolding & Design System
- [x] Initialize Next.js 14 project
- [x] Install all dependencies
- [x] Set up shadcn/ui
- [x] Configure Tailwind theme (colors, fonts, CSS variables)
- [x] Set up dark mode (next-themes)
- [x] Create project file structure
- [x] Create types, constants, formatters

## Phase 2 — Database Schema & Supabase Integration
- [x] Create migration SQL file (`supabase/migrations/001_initial_schema.sql`)
- [x] Set up Supabase client (browser + server)
- [x] Create `.env.local.example`
- [x] Set up Next.js middleware (auth guard & session refresh)

## Phase 3 — Authentication
- [x] Zod schemas for auth forms
- [x] Server Actions for auth (signup, signin, signout, forgot/reset password)
- [x] Sign Up page (`/signup`)
- [x] Login page (`/login`)
- [x] Verify Email page (`/verify-email`)
- [x] Forgot Password page (`/forgot-password`)
- [x] Reset Password page (`/reset-password`)
- [x] Auth callback handler (`/auth/callback`)

## Phase 4 — Onboarding & Fund Config
- [x] Onboarding wizard component (4-step wizard with presets & custom fund support)
- [x] Fund config Server Actions (create, update, delete with entry check guard)
- [x] Fund config Zod schema

## Phase 5 — SIP Entry CRUD + CSV Import
- [x] Entry Zod schema
- [x] Entry form component (dialog form with auto-units calculation & manual override)
- [x] Entry Server Actions (CRUD + CSV import action)
- [x] History table component (responsive desktop table & mobile cards)
- [x] CSV import dialog (client preview & row validation)

## Phase 6 — Dashboard & Charts
- [x] Dashboard data Server Action (`getDashboardData`)
- [x] Summary cards component (6 cards with tabular numbers & conditional gain/loss styling)
- [x] Latest NAV input component (inline fast-edit)
- [x] Fund selector (tabs)
- [x] Portfolio value line chart (Recharts)
- [x] Invested vs Gain pie chart (Recharts)
- [x] Monthly contributions bar chart (Recharts)
- [x] NAV history line chart (Recharts)
- [x] Fee drag area chart (Recharts)

## Phase 7 — Projections & Settings
- [x] Projection calculations (table + chart data generators)
- [x] Projection table + chart (solid historical vs dotted projected lines)
- [x] Projections page with 8%/10%/12% CAGR & 0/5/10/15% step-up options
- [x] Settings page (fund management, change password, delete account dialog)

## Phase 8 — Calculation Engine
- [x] XIRR Newton-Raphson solver (with 3-entry threshold & convergence guards)
- [x] Fee drag calculator (cumulative illustrative fee calculation)
- [x] SIP streak calculator (consecutive calendar months calculation)

## Phase 9 — Landing Page & Polish
- [x] Landing page (hero, value props, feature highlights, CTAs)
- [x] Responsive verification (desktop sidebar + mobile bottom tab bar & top header)
- [x] Dark mode verification (full CSS variables palette)
- [x] App layout shell (Sidebar + BottomTabBar + Header)
