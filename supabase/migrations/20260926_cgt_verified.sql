-- ============================================================
-- SahakariSIP - Verified CGT schedule: FY 2083/84 statutory slab
-- ============================================================
-- Run this ONCE in the Supabase SQL Editor. Re-running is safe
-- (guarded by the NOT EXISTS checks).
--
-- WHAT WAS VERIFIED 2026-09-24:
-- Lot-aged capital-gains schedule for resident individuals
-- redeeming mutual-fund units: 7.5% on gains held OVER 365 days,
-- 10% on gains held 365 days or less - per the Finance Act 2083
-- (Economic Act 2083) effective Shrawan 1, 2083 (2026-07-17),
-- amending the Income Tax Act 2058 (Sec. 95A withholding, final
-- tax). Corroborated by Fiscal Nepal, Nepal News (Finance Bill
-- text) and the kharchapatra FY 2083/84 rate table.
-- A September 2083 Cabinet decision to cut listed rates to
-- 3.5%/5% is reported but NOT enacted - recorded in notes only,
-- never as a rate.
-- ============================================================

INSERT INTO tax_rules
  (asset_type, tax_type, transaction_type, taxpayer_type, rate_pct,
   holding_period_days, holding_period_operator,
   effective_from, official_source, official_source_url, verified_at, notes)
SELECT
  'MUTUAL_FUND_OPEN_ENDED', 'CAPITAL_GAINS', 'REDEMPTION', 'INDIVIDUAL_RESIDENT', 7.5,
  365, 'GT',
  '2026-07-17',
  'Finance Act 2083 (Economic Act 2083) - FY 2083/84 CGT schedule',
  'https://www.fiscalnepal.com/2026/07/16/26974/new-cgt-rates-on-shares-real-estate-take-effect-friday',
  '2026-09-24',
  'Long-term: gains on lots held over 365 days. Pending (not applied): Sept 2083 Cabinet decision to cut listed rates to 3.5%/5% - reported, not enacted.'
WHERE NOT EXISTS (
  SELECT 1 FROM tax_rules
  WHERE tax_type = 'CAPITAL_GAINS'
    AND transaction_type = 'REDEMPTION'
    AND taxpayer_type = 'INDIVIDUAL_RESIDENT'
    AND holding_period_operator = 'GT'
);

INSERT INTO tax_rules
  (asset_type, tax_type, transaction_type, taxpayer_type, rate_pct,
   holding_period_days, holding_period_operator,
   effective_from, official_source, official_source_url, verified_at, notes)
SELECT
  'MUTUAL_FUND_OPEN_ENDED', 'CAPITAL_GAINS', 'REDEMPTION', 'INDIVIDUAL_RESIDENT', 10,
  365, 'LE',
  '2026-07-17',
  'Finance Act 2083 (Economic Act 2083) - FY 2083/84 CGT schedule',
  'https://english.nepalnews.com/s/business/capital-gains-tax-on-share-trading-and-real-estate-transactions-increases',
  '2026-09-24',
  'Short-term: gains on lots held 365 days or less.'
WHERE NOT EXISTS (
  SELECT 1 FROM tax_rules
  WHERE tax_type = 'CAPITAL_GAINS'
    AND transaction_type = 'REDEMPTION'
    AND taxpayer_type = 'INDIVIDUAL_RESIDENT'
    AND holding_period_operator = 'LE'
);
