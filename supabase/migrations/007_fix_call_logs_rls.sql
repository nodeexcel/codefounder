-- Fix: call_logs RLS policy previously allowed all authenticated users to read
-- rows where user_id IS NULL, leaking PII across tenants.
-- Policy now strictly enforces per-user isolation.

DROP POLICY IF EXISTS "Users can view own call_logs" ON public.call_logs;

CREATE POLICY "Users can view own call_logs"
  ON public.call_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
