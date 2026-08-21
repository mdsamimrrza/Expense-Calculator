-- ============================================================
-- SahakariSIP — Push Notifications & Notification Preferences
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);

-- 2. Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id             UUID PRIMARY KEY REFERENCES next_auth.users(id) ON DELETE CASCADE,
  push_enabled        BOOLEAN NOT NULL DEFAULT true,
  email_enabled       BOOLEAN NOT NULL DEFAULT true,
  reminder_day        INTEGER NOT NULL DEFAULT 1 CHECK (reminder_day >= 1 AND reminder_day <= 28),
  notify_days_before  INTEGER NOT NULL DEFAULT 2 CHECK (notify_days_before >= 0 AND notify_days_before <= 7),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Subscriptions RLS
CREATE POLICY "users manage own push_subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (next_auth.uid() = user_id)
  WITH CHECK (next_auth.uid() = user_id);

-- Preferences RLS
CREATE POLICY "users manage own notification_preferences"
  ON public.notification_preferences FOR ALL
  USING (next_auth.uid() = user_id)
  WITH CHECK (next_auth.uid() = user_id);

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER tr_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER tr_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
