-- ============================================================
-- SahakariSIP — Credentials Auth Migration
-- Run this in Supabase SQL Editor
-- Existing tables (users, accounts, sessions, verification_tokens) are UNTOUCHED
-- ============================================================

-- 1. Password storage for email+password users
--    Linked to existing next_auth.users via foreign key
CREATE TABLE IF NOT EXISTS next_auth.user_passwords (
  user_id uuid PRIMARY KEY REFERENCES next_auth.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. OTP tokens for the 3-step forgot password flow
CREATE TABLE IF NOT EXISTS public.otp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_hash text NOT NULL,
  reset_token text,           -- short-lived token granted after OTP is verified
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_tokens_email ON public.otp_tokens(email);

-- Auto-cleanup old/used OTP tokens (optional, keeps table clean)
-- You can run this manually or set up a cron job via pg_cron
-- DELETE FROM public.otp_tokens WHERE expires_at < now() OR used = true;
