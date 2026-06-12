-- Temporary OTP storage for phone number verification
CREATE TABLE IF NOT EXISTS phone_otps (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text       NOT NULL,
  otp_code    text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  verified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_otps_lookup
  ON phone_otps(user_id, phone_number, created_at DESC);

ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;

-- All access goes through the service role key (admin client); no direct access
CREATE POLICY "No direct access" ON phone_otps
  USING (false)
  WITH CHECK (false);
