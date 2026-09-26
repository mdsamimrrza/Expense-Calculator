-- ============================================================
-- 20260926_nav_reference.sql
-- Shared per-fund NAV series: ONE row per (fund, date) for ALL
-- users. The cron writes it once per fund; every user reads the
-- same series. Per-user nav_history keeps only user-entered
-- points and stops growing with the user count.
--
-- Backfill dedupes the existing per-user series into the shared
-- table (idempotent - safe to re-run).
-- ============================================================

CREATE TABLE IF NOT EXISTS nav_reference (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_key   TEXT NOT NULL,
  nav_date   DATE NOT NULL,
  nav_value  NUMERIC(8,2) NOT NULL CHECK (nav_value > 0),
  source     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_nav_reference_fund_date UNIQUE (fund_key, nav_date)
);

CREATE INDEX IF NOT EXISTS idx_nav_reference_fund_date
  ON nav_reference(fund_key, nav_date DESC);

ALTER TABLE nav_reference ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read nav_reference" ON nav_reference;
CREATE POLICY "authenticated read nav_reference"
  ON nav_reference FOR SELECT
  TO authenticated
  USING (true);

-- Backfill: collapse the per-user series into one shared series per
-- fund. fund_key is the normalized fund name (lowercased, trimmed).
-- Where users' stored values disagree, the highest wins (deterministic)
-- - the cron's market upserts overwrite with the true series as it runs.
INSERT INTO nav_reference (fund_key, nav_date, nav_value)
SELECT DISTINCT ON (LOWER(TRIM(f.fund_name)), n.nav_date)
       LOWER(TRIM(f.fund_name)) AS fund_key,
       n.nav_date,
       n.nav_value
FROM nav_history n
JOIN fund_config f ON f.id = n.fund_id
ORDER BY LOWER(TRIM(f.fund_name)), n.nav_date, n.nav_value DESC
ON CONFLICT (fund_key, nav_date) DO NOTHING;
