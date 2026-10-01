-- ============================================================
-- SahakariSIP - Dividend records
--
-- Nepali open-ended mutual funds distribute profit once a year,
-- declared as a % of the Rs 10 face value (7% = Rs 0.70/unit),
-- paid to units held on the announced book-closure (record) date,
-- with 5% TDS deducted at source for individuals (final tax).
-- The NAV drops by the per-unit amount on the effective date - the
-- cron's scraped NAV series already shows that drop, so these rows
-- only need to make the CASH that left the fund visible again.
--
-- Amounts are computed server-side at insert time from the user's
-- own entries (units held on record_date), so the form only asks
-- for fund, record date and dividend %.
-- ============================================================

CREATE TABLE dividends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_id         UUID NOT NULL REFERENCES fund_config(id) ON DELETE CASCADE,
  record_date     DATE NOT NULL,
  dividend_pct    NUMERIC(8,4) NOT NULL CHECK (dividend_pct > 0),
  per_unit        NUMERIC(10,4) NOT NULL CHECK (per_unit > 0),
  units_at_record NUMERIC(14,4) NOT NULL CHECK (units_at_record > 0),
  gross_amount    NUMERIC(14,2) NOT NULL CHECK (gross_amount > 0),
  tds_pct         NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (tds_pct >= 0),
  tds_amount      NUMERIC(14,2) NOT NULL CHECK (tds_amount >= 0),
  net_amount      NUMERIC(14,2) NOT NULL CHECK (net_amount > 0),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One distribution per fund per record date: the same dividend
  -- cannot be recorded twice.
  UNIQUE (fund_id, record_date)
);

CREATE INDEX idx_dividends_user_fund_date
  ON dividends (user_id, fund_id, record_date);

ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own dividends"
  ON dividends FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
