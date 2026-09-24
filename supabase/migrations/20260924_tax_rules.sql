-- ============================================================
-- SahakariSIP - Centralized tax & charge rules
--
-- Every tax/charge figure the app shows must resolve to a row
-- here with an official source. CAPITAL_GAINS rows are seeded
-- ONLY after the statutory Nepal rate has been verified against
-- the IRD / Finance Act - the table intentionally starts with
-- zero capital-gains rows, and the app renders an explicit
-- "not verified" message instead of a guessed rate.
--
-- Exit-load seeds below come from the fund managers' official
-- pages (URLs in official_source_url) and are held in the SAME
-- table so every rule carries one schema, effective dates and a
-- verification record - charges are distinguished from taxes by
-- tax_type.
-- ============================================================

CREATE TABLE tax_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country               TEXT NOT NULL DEFAULT 'NP',
  fund_id               UUID REFERENCES fund_config(id) ON DELETE CASCADE,
  asset_type            TEXT NOT NULL,
  tax_type              TEXT NOT NULL
    CHECK (tax_type IN ('CAPITAL_GAINS', 'DIVIDEND', 'EXIT_LOAD', 'DP_FEE', 'OTHER')),
  transaction_type      TEXT NOT NULL,
  taxpayer_type         TEXT,
  rate_pct              NUMERIC(8,4),
  rate_type             TEXT NOT NULL DEFAULT 'PERCENT' CHECK (rate_type IN ('PERCENT', 'FLAT')),
  holding_period_days   INT,
  holding_period_operator TEXT CHECK (holding_period_operator IN ('LT', 'LE', 'GE', 'GT')),
  effective_from        DATE,
  effective_to          DATE,
  official_source       TEXT,
  official_source_url   TEXT,
  verified_at           DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A VERIFIED claim needs its evidence on the same row.
  CONSTRAINT tax_rule_verified_requires_source CHECK (
    verified_at IS NULL
    OR (official_source IS NOT NULL AND official_source_url IS NOT NULL)
  )
);

CREATE INDEX idx_tax_rules_lookup
  ON tax_rules (asset_type, tax_type, transaction_type, effective_from, effective_to);

ALTER TABLE tax_rules ENABLE ROW LEVEL SECURITY;

-- Global reference data: readable by every authenticated user, writable by none.
CREATE POLICY "authenticated read tax_rules"
  ON tax_rules FOR SELECT
  TO authenticated
  USING (true);

-- No write policy for any user role. Admins maintain this reference data
-- via the service_role key or the Supabase SQL editor, both of which bypass
-- RLS. Deliberately NOT gated on a JWT claim: user_metadata is writable by
-- the user and must never gate a security decision.

CREATE TRIGGER set_tax_rules_updated_at
  BEFORE UPDATE ON tax_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Verified exit-load seeds (fund charges, NOT tax).
-- SSIS: Siddhartha Capital official FAQ - 1.5% of applicable NAV
-- within 1 year of purchase, none after.
-- NIBL Sahabhagita: NIMB Ace Capital official scheme page -
-- 1.5% (<6 mo), 1.25% (6–12 mo), 1% (12–18 mo), 0.75% (18–24 mo),
-- none listed beyond 24 months.
-- fund_id is NULL: these rules belong to the fund NAME, not to
-- any user's fund_config row.
-- ============================================================

INSERT INTO tax_rules
  (asset_type, tax_type, transaction_type, rate_pct, holding_period_days, holding_period_operator, official_source, official_source_url, verified_at, notes)
VALUES
  ('MUTUAL_FUND_OPEN_ENDED', 'EXIT_LOAD', 'REDEMPTION', 1.5, 365, 'LT',
   'Siddhartha Capital - SSIS FAQ', 'https://www.siddharthacapital.com/ssis-faq/', '2026-09-23',
   'Fund: SSIS. 1.5% of applicable NAV within 1 year of purchase.'),
  ('MUTUAL_FUND_OPEN_ENDED', 'EXIT_LOAD', 'REDEMPTION', 0, NULL, NULL,
   'Siddhartha Capital - SSIS FAQ', 'https://www.siddharthacapital.com/ssis-faq/', '2026-09-23',
   'Fund: SSIS. No exit load after 1 year of purchase.'),
  ('MUTUAL_FUND_OPEN_ENDED', 'EXIT_LOAD', 'REDEMPTION', 1.5, 183, 'LT',
   'NIMB Ace Capital - NIBL Sahabhagita Fund scheme page', 'https://nimbacecapital.com/nibl-sahabhagita-fund/', '2026-09-23',
   'Fund: NIBL Sahabhagita Fund. 1.5% of applicable NAV within 6 months of purchase.'),
  ('MUTUAL_FUND_OPEN_ENDED', 'EXIT_LOAD', 'REDEMPTION', 1.25, 365, 'LT',
   'NIMB Ace Capital - NIBL Sahabhagita Fund scheme page', 'https://nimbacecapital.com/nibl-sahabhagita-fund/', '2026-09-23',
   'Fund: NIBL Sahabhagita Fund. 1.25% of applicable NAV within 6–12 months of purchase.'),
  ('MUTUAL_FUND_OPEN_ENDED', 'EXIT_LOAD', 'REDEMPTION', 1.0, 548, 'LT',
   'NIMB Ace Capital - NIBL Sahabhagita Fund scheme page', 'https://nimbacecapital.com/nibl-sahabhagita-fund/', '2026-09-23',
   'Fund: NIBL Sahabhagita Fund. 1% of applicable NAV within 12–18 months of purchase.'),
  ('MUTUAL_FUND_OPEN_ENDED', 'EXIT_LOAD', 'REDEMPTION', 0.75, 730, 'LT',
   'NIMB Ace Capital - NIBL Sahabhagita Fund scheme page', 'https://nimbacecapital.com/nibl-sahabhagita-fund/', '2026-09-23',
   'Fund: NIBL Sahabhagita Fund. 0.75% of applicable NAV within 18–24 months of purchase.'),
  ('MUTUAL_FUND_OPEN_ENDED', 'EXIT_LOAD', 'REDEMPTION', 0, NULL, NULL,
   'NIMB Ace Capital - NIBL Sahabhagita Fund scheme page', 'https://nimbacecapital.com/nibl-sahabhagita-fund/', '2026-09-23',
   'Fund: NIBL Sahabhagita Fund. No exit load listed beyond 24 months.');