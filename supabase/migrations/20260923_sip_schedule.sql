-- ============================================================
-- SahakariSIP - Registered SIP schedule on fund_config
--
-- Extends the existing SIP configuration (no second source of
-- truth, no materialized installments). Future due dates are
-- DERIVED from these columns by the central schedule engine.
--
-- Existing rows are NOT backfilled with an assumed anchor:
-- schedule_verified defaults to false and the user must confirm
-- their actual registered schedule in Settings.
-- ============================================================

ALTER TABLE fund_config
  ADD COLUMN sip_type TEXT NOT NULL DEFAULT 'UNLIMITED'
    CHECK (sip_type = 'UNLIMITED'),
  ADD COLUMN frequency TEXT
    CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY')),
  ADD COLUMN calendar_system TEXT
    CHECK (calendar_system IN ('AD', 'BS')),
  -- The user's REGISTERED first SIP due date (anchor), stored as AD.
  -- For BS registrations this is the AD date of the registered BS due date.
  ADD COLUMN anchor_date DATE,
  -- True once the user has confirmed the registered schedule above.
  -- NULL/False rows are incomplete: no reminders, no derived due dates.
  ADD COLUMN schedule_verified BOOLEAN NOT NULL DEFAULT false;

-- A verified schedule must be complete.
ALTER TABLE fund_config
  ADD CONSTRAINT sip_schedule_complete CHECK (
    NOT schedule_verified
    OR (frequency IS NOT NULL AND calendar_system IS NOT NULL AND anchor_date IS NOT NULL)
  );
