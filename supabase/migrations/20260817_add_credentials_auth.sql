-- ============================================================
-- SahakariSIP — Credentials Auth Migration
-- Run this in Supabase SQL Editor
-- Existing tables (users, accounts, sessions, verification_tokens) are UNTOUCHED
-- ============================================================

-- 1. Password storage for email+password users
--    Lives in public schema (always accessible via PostgREST)
--    References next_auth.users via user_id
CREATE TABLE IF NOT EXISTS public.user_passwords (
  user_id uuid PRIMARY KEY,
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

-- Enable RLS (Row Level Security) — service role bypasses it automatically
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_tokens ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup old/used OTP tokens (optional — run manually to keep table clean)
-- DELETE FROM public.otp_tokens WHERE expires_at < now() OR (used = true AND created_at < now() - interval '1 day');
