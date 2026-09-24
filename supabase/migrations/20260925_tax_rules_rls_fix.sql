-- ============================================================
-- SahakariSIP - Fix tax_rules RLS (drop user_metadata admin gate)
--
-- The earlier 20260924 migration granted admin write access on
-- tax_rules by checking `auth.jwt() -> 'user_metadata' ->> 'role'`.
-- user_metadata is writable by the end user (supabase.auth.updateUser),
-- so any signed-in user could grant themselves role='admin' and pass
-- that policy. tax_rules is global reference data; admins maintain it
-- with the service_role key or SQL editor, which bypass RLS - no
-- user-facing write policy is needed. This drops the vulnerable policy
-- if it exists.
--
-- Safe to re-run (idempotent).
-- ============================================================

DROP POLICY IF EXISTS "admin manages tax_rules" ON public.tax_rules;