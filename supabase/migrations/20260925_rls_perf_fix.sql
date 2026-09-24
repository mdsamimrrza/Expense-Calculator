-- ============================================================
-- SahakariSIP - RLS Performance Fix (wrap auth.uid() in SELECT)
--
-- The Supabase linter flags policies that call auth.uid() directly
-- because it's re-evaluated once per row instead of once per query.
-- Wrapping in (SELECT auth.uid()) makes it a subquery that the
-- planner evaluates once and reuses. Safe to re-run (idempotent).
-- ============================================================

-- fund_config
DROP POLICY IF EXISTS "users manage own fund_config" ON public.fund_config;
CREATE POLICY "users manage own fund_config"
  ON public.fund_config FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- entries
DROP POLICY IF EXISTS "users manage own entries" ON public.entries;
CREATE POLICY "users manage own entries"
  ON public.entries FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- nav_history
DROP POLICY IF EXISTS "users manage own nav_history" ON public.nav_history;
CREATE POLICY "users manage own nav_history"
  ON public.nav_history FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- push_subscriptions
DROP POLICY IF EXISTS "users manage own push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "users manage own push_subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (next_auth.uid() = user_id OR (SELECT auth.uid()) = user_id)
  WITH CHECK (next_auth.uid() = user_id OR (SELECT auth.uid()) = user_id);

-- notification_preferences
DROP POLICY IF EXISTS "users manage own notification_preferences" ON public.notification_preferences;
CREATE POLICY "users manage own notification_preferences"
  ON public.notification_preferences FOR ALL
  USING (next_auth.uid() = user_id OR (SELECT auth.uid()) = user_id)
  WITH CHECK (next_auth.uid() = user_id OR (SELECT auth.uid()) = user_id);

-- notifications_log
DROP POLICY IF EXISTS "users manage own notifications_log" ON public.notifications_log;
CREATE POLICY "users manage own notifications_log"
  ON public.notifications_log FOR ALL
  USING (next_auth.uid() = user_id OR (SELECT auth.uid()) = user_id)
  WITH CHECK (next_auth.uid() = user_id OR (SELECT auth.uid()) = user_id);