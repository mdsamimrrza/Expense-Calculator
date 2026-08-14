-- ============================================================
-- SahakariSIP — NextAuth + Supabase Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Expose next_auth schema to PostgREST API
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, next_auth';
NOTIFY pgrst, 'reload config';

-- 2. Create the next_auth schema and tables required by Auth.js

CREATE SCHEMA IF NOT EXISTS next_auth;

GRANT USAGE ON SCHEMA next_auth TO service_role;
GRANT ALL ON SCHEMA next_auth TO postgres;

-- Create users table
CREATE TABLE IF NOT EXISTS next_auth.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  email text,
  "emailVerified" timestamp with time zone,
  image text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT email_unique UNIQUE (email)
);

GRANT ALL ON TABLE next_auth.users TO service_role;
GRANT ALL ON TABLE next_auth.users TO postgres;

-- Create accounts table
CREATE TABLE IF NOT EXISTS next_auth.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  type text NOT NULL,
  provider text NOT NULL,
  "providerAccountId" text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  oauth_token_secret text,
  oauth_token text,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT provider_unique UNIQUE (provider, "providerAccountId"),
  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES next_auth.users(id) ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.accounts TO service_role;
GRANT ALL ON TABLE next_auth.accounts TO postgres;

-- Create sessions table
CREATE TABLE IF NOT EXISTS next_auth.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expires timestamp with time zone NOT NULL,
  "sessionToken" text NOT NULL,
  "userId" uuid NOT NULL,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessiontoken_unique UNIQUE ("sessionToken"),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES next_auth.users(id) ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.sessions TO service_role;
GRANT ALL ON TABLE next_auth.sessions TO postgres;

-- Create verification_tokens table
CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
  identifier text,
  token text,
  expires timestamp with time zone NOT NULL,
  CONSTRAINT verification_tokens_pkey PRIMARY KEY (token),
  CONSTRAINT token_identifier_unique UNIQUE (token, identifier)
);

GRANT ALL ON TABLE next_auth.verification_tokens TO service_role;
GRANT ALL ON TABLE next_auth.verification_tokens TO postgres;

-- ============================================================
-- 2. Drop existing foreign keys to auth.users and RLS policies
-- ============================================================

-- Drop existing foreign keys
ALTER TABLE public.fund_config DROP CONSTRAINT IF EXISTS fund_config_user_id_fkey;
ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_user_id_fkey;
ALTER TABLE public.nav_history DROP CONSTRAINT IF EXISTS nav_history_user_id_fkey;

-- Since this is a fresh auth migration and existing users won't map automatically,
-- we clear the tables to avoid orphaned data violating the new foreign key constraints.
-- (Only doing this because it's a personal app without production users yet)
TRUNCATE TABLE public.nav_history CASCADE;
TRUNCATE TABLE public.entries CASCADE;
TRUNCATE TABLE public.fund_config CASCADE;

-- Add new foreign keys pointing to next_auth.users
ALTER TABLE public.fund_config
  ADD CONSTRAINT fund_config_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.entries
  ADD CONSTRAINT entries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.nav_history
  ADD CONSTRAINT nav_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES next_auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- 3. Create Custom NextAuth UID function for RLS
-- ============================================================

-- This function extracts the NextAuth user ID from the custom JWT
CREATE OR REPLACE FUNCTION next_auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- ============================================================
-- 4. Recreate RLS Policies using next_auth.uid()
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS "users manage own fund_config" ON fund_config;
DROP POLICY IF EXISTS "admin reads all fund_config" ON fund_config;
DROP POLICY IF EXISTS "users manage own entries" ON entries;
DROP POLICY IF EXISTS "admin reads all entries" ON entries;
DROP POLICY IF EXISTS "users manage own nav_history" ON nav_history;
DROP POLICY IF EXISTS "admin reads all nav_history" ON nav_history;

-- fund_config
CREATE POLICY "users manage own fund_config"
  ON fund_config FOR ALL
  USING (next_auth.uid() = user_id)
  WITH CHECK (next_auth.uid() = user_id);

-- entries
CREATE POLICY "users manage own entries"
  ON entries FOR ALL
  USING (next_auth.uid() = user_id)
  WITH CHECK (next_auth.uid() = user_id);

-- nav_history
CREATE POLICY "users manage own nav_history"
  ON nav_history FOR ALL
  USING (next_auth.uid() = user_id)
  WITH CHECK (next_auth.uid() = user_id);
