-- Fix subscriptions table schema
-- Root cause: updated_at column missing caused every webhook/sync upsert to fail.
-- Plan constraint also excluded 'elite' which is a purchasable plan in PLAN_CONFIG.
--
-- Safe to run on production:
--   - ADD COLUMN IF NOT EXISTS: no-op if column already exists
--   - DROP CONSTRAINT IF EXISTS: no-op if constraint already dropped
--   - UPDATE backfill: no-op if table is empty or all rows already have updated_at
--   - No rows deleted, no columns dropped

-- 1. Add missing updated_at column
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- 2. Backfill any existing rows
UPDATE public.subscriptions
  SET updated_at = created_at
  WHERE updated_at IS NULL;

-- 3. Replace plan check constraint
--    Includes every value the application may write:
--      free    — billing page display fallback (defensive, never actually inserted)
--      starter — purchasable via PLAN_CONFIG
--      growth  — legacy value in original constraint, kept for backward compat
--      pro     — purchasable via PLAN_CONFIG
--      elite   — purchasable via PLAN_CONFIG (was missing, blocked elite checkouts)
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'starter', 'growth', 'pro', 'elite'));
