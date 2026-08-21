-- ============================================================
-- SahakariSIP — Notifications History Log
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'installment_reminder',
  channel     TEXT NOT NULL DEFAULT 'all',
  url         TEXT DEFAULT '/history',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_log_user_date ON public.notifications_log(user_id, created_at DESC);

-- Grant table access
GRANT ALL ON TABLE public.notifications_log TO postgres, service_role, authenticated;

-- Row Level Security
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own notifications_log" ON public.notifications_log;
CREATE POLICY "users manage own notifications_log"
  ON public.notifications_log FOR ALL
  USING (next_auth.uid() = user_id OR auth.uid() = user_id)
  WITH CHECK (next_auth.uid() = user_id OR auth.uid() = user_id);
