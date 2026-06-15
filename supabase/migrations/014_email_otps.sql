-- email_otps: stores short-lived OTP codes used for custom email verification during signup.
-- IMPORTANT: column names must match src/app/api/auth/send-email-otp/route.ts
--            and src/app/api/auth/verify-email-otp/route.ts exactly.
--
-- Do NOT use a simplified schema (e.g. "otp" or "verified boolean") — the API routes
-- insert/query: user_id, otp_code, verified_at, attempt_count.

CREATE TABLE IF NOT EXISTS public.email_otps (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text        NOT NULL,
  otp_code      text        NOT NULL,
  expires_at    timestamptz NOT NULL,
  verified_at   timestamptz,
  attempt_count int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_lookup
  ON public.email_otps (email, created_at DESC);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- All access goes through the service-role key in API routes only.
-- Drop and recreate so this file is safe to run even if 014_email_verification.sql
-- already created the policy under a different name.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'email_otps'
      AND policyname = 'No direct client access'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "No direct client access"
        ON public.email_otps
        USING (false)
        WITH CHECK (false)
    $policy$;
  END IF;
END
$$;

-- welcome_email_sent is read/written by verify-email-otp to avoid duplicate welcome emails.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent boolean NOT NULL DEFAULT false;
