-- Fix subscriptions table:
-- 1. Extend plan check constraint to include 'elite' (was missing — Elite checkout
--    upserts were failing with a constraint violation).
--    'growth' is kept for backward compat with any legacy records.
-- 2. Add updated_at so webhook handlers can stamp each sync.

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('starter', 'growth', 'pro', 'elite'));

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.subscriptions
  SET updated_at = created_at
  WHERE updated_at IS NULL;
