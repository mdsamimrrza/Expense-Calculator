-- ============================================================
-- SahakariSIP — Initial Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Supabase Auth provides `auth.users` automatically — do not create
-- a custom users table for auth. Use `auth.users.id` as FK everywhere.
-- Admin flag lives in auth.users raw_user_meta_data->>'role'

-- ============================================================
-- TABLE: fund_config
-- ============================================================

CREATE TABLE fund_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_name     TEXT NOT NULL,               -- e.g. "NMB Saral Bachat Fund-E"
  fee_rate_pct  NUMERIC(5,2) NOT NULL,       -- e.g. 1.80
  start_date    DATE NOT NULL,
  monthly_sip   NUMERIC(12,2) NOT NULL,      -- planned amount, used for projections
  latest_nav    NUMERIC(8,2),                -- manually refreshed by user, nullable until first set
  latest_nav_date DATE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: entries
-- ============================================================

CREATE TABLE entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_id       UUID NOT NULL REFERENCES fund_config(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  nav           NUMERIC(8,2) NOT NULL CHECK (nav > 0),
  units         NUMERIC(14,4) NOT NULL CHECK (units > 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance index for per-user, per-fund, date-ordered queries
CREATE INDEX idx_entries_user_fund_date ON entries(user_id, fund_id, purchase_date);

-- ============================================================
-- ROW LEVEL SECURITY — MANDATORY
-- A table without RLS is a data leak, not a feature.
-- ============================================================

ALTER TABLE fund_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Users can only CRUD their own fund_config rows
CREATE POLICY "users manage own fund_config"
  ON fund_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only CRUD their own entries
CREATE POLICY "users manage own entries"
  ON entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin read-all policies (for admin panel in v2)
CREATE POLICY "admin reads all fund_config"
  ON fund_config FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin reads all entries"
  ON entries FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ============================================================
-- TRIGGER: auto-update updated_at on row changes
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_fund_config_updated_at
  BEFORE UPDATE ON fund_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
