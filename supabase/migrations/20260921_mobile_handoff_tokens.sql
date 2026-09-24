-- ============================================================
-- Mobile (APK) Google sign-in handoff - 2026-09-21
-- ============================================================
-- The APK starts Google OAuth on this web app (the only place NextAuth
-- and the Google redirect URI live), then picks up a session via a
-- single-use handoff token. This migration:
--   1. creates public.mobile_handoff_tokens (60-second, single-use),
--   2. re-keys any data rows the old APK wrote under Supabase-native
--      auth.users identities onto the matching next_auth.users row
--      (joined by email), so existing phone accounts keep their data.
-- ============================================================

create table if not exists public.mobile_handoff_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references next_auth.users(id) on delete cascade,
  nonce      text not null unique,
  created_at timestamptz not null default now()
);

-- Single-use: consumed rows are deleted server-side immediately.
alter table public.mobile_handoff_tokens enable row level security;
-- No policies → only the service role can touch this table.

-- Sweep expired-but-never-used tokens (crashed browser mid-handoff).
delete from public.mobile_handoff_tokens
where created_at < now() - interval '10 minutes';

-- ------------------------------------------------------------
-- Re-key legacy Supabase-auth data onto next_auth identities.
-- The previous APK built signed via Supabase Auth (auth.users) and
-- wrote fund_config/entries/nav_history/notification_preferences/
-- notifications_log with those uuids. The new mobile flow runs on the
-- web's next_auth ids, so map old → new by email before RLS hides the
-- old rows.
-- ------------------------------------------------------------
with id_map as (
  select su.id as old_id, nu.id as new_id
  from auth.users su
  join next_auth.users nu on lower(nu.email) = lower(su.email)
)
update public.entries e
set user_id = m.new_id
from id_map m
where e.user_id = m.old_id;

with id_map as (
  select su.id as old_id, nu.id as new_id
  from auth.users su
  join next_auth.users nu on lower(nu.email) = lower(su.email)
)
update public.fund_config f
set user_id = m.new_id
from id_map m
where f.user_id = m.old_id;

with id_map as (
  select su.id as old_id, nu.id as new_id
  from auth.users su
  join next_auth.users nu on lower(nu.email) = lower(su.email)
)
update public.nav_history n
set user_id = m.new_id
from id_map m
where n.user_id = m.old_id;

with id_map as (
  select su.id as old_id, nu.id as new_id
  from auth.users su
  join next_auth.users nu on lower(nu.email) = lower(su.email)
)
update public.notification_preferences p
set user_id = m.new_id
from id_map m
where p.user_id = m.old_id;

with id_map as (
  select su.id as old_id, nu.id as new_id
  from auth.users su
  join next_auth.users nu on lower(nu.email) = lower(su.email)
)
update public.notifications_log l
set user_id = m.new_id
from id_map m
where l.user_id = m.old_id;
