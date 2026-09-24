-- ============================================================
-- SahakariSIP - Security Hardening Migration (audit run sahakari-sip-run-1)
-- Run this in the Supabase SQL Editor.
-- Safe to re-run: every statement is idempotent.
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. otp_tokens: flow purpose + verification attempt tracking
--    Used by signup verification and the forgot-password flow.
--    'attempts' enforces a 5-strike lockout per OTP row.
-- ────────────────────────────────────────────────
ALTER TABLE public.otp_tokens ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'password_reset';
ALTER TABLE public.otp_tokens ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

-- ────────────────────────────────────────────────
-- 2. next_auth.users: credential epoch for session invalidation
--    Bumped on password reset; the NextAuth jwt callback rejects
--    sessions whose epoch is older than the stored value, and
--    treats a missing row (deleted account) as stale.
-- ────────────────────────────────────────────────
ALTER TABLE next_auth.users ADD COLUMN IF NOT EXISTS credential_epoch bigint NOT NULL DEFAULT 0;

-- ────────────────────────────────────────────────
-- 3. notifications_log: reminder idempotency
--    fund_id + notify_date let the reminders cron skip funds it
--    already notified for a given due date (no duplicate sends).
-- ────────────────────────────────────────────────
ALTER TABLE public.notifications_log ADD COLUMN IF NOT EXISTS fund_id uuid;
ALTER TABLE public.notifications_log ADD COLUMN IF NOT EXISTS notify_date date;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_log_fund_notify_date
  ON public.notifications_log (user_id, fund_id, notify_date)
  WHERE fund_id IS NOT NULL;

-- ────────────────────────────────────────────────
-- 4. rate_limit_events: shared, serverless-safe rate limiting
--    Replaces the per-instance in-memory Map. Service role only
--    (RLS enabled, no policies). Cleanup: delete rows older than
--    1 day, e.g. via a scheduled Supabase function or manually:
--    DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '1 day';
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_key_time
  ON public.rate_limit_events (key, created_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────
-- 5. fund_config: plausibility bound on the NAV users actually see
--    (nav_history already has CHECK (nav_value > 0)).
--    NOT VALID so existing rows don't block the migration -
--    optionally validate later after cleaning anomalies:
--    ALTER TABLE public.fund_config VALIDATE CONSTRAINT fund_config_latest_nav_positive;
-- ────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fund_config_latest_nav_positive'
  ) THEN
    ALTER TABLE public.fund_config
      ADD CONSTRAINT fund_config_latest_nav_positive CHECK (latest_nav > 0) NOT VALID;
  END IF;
END $$;
