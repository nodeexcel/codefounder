-- Email OTP verification table
-- Used to verify user email addresses during signup before granting access.
CREATE TABLE IF NOT EXISTS email_otps (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text        NOT NULL,
  otp_code      text        NOT NULL,
  expires_at    timestamptz NOT NULL,
  verified_at   timestamptz,
  attempt_count int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_lookup
  ON email_otps(email, created_at DESC);

ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;

-- All reads/writes go through the service role key only (admin client in API routes).
-- No direct client access is permitted.
CREATE POLICY "No direct client access"
  ON email_otps
  USING (false)
  WITH CHECK (false);

-- Track whether a welcome email has been sent to avoid duplicates.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent boolean NOT NULL DEFAULT false;
