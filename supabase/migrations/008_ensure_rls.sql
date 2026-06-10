-- Enable RLS on all tables (idempotent — safe to run even if already enabled)
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_wizard_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs               ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Users can only read and update their own profile row.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles: select own'
  ) THEN
    CREATE POLICY "profiles: select own"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles: update own'
  ) THEN
    CREATE POLICY "profiles: update own"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ── agent_wizard_sessions ────────────────────────────────────────────────────
-- Users can only read, insert, and update their own wizard sessions.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agent_wizard_sessions' AND policyname = 'agent_wizard_sessions: select own'
  ) THEN
    CREATE POLICY "agent_wizard_sessions: select own"
      ON public.agent_wizard_sessions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agent_wizard_sessions' AND policyname = 'agent_wizard_sessions: insert own'
  ) THEN
    CREATE POLICY "agent_wizard_sessions: insert own"
      ON public.agent_wizard_sessions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agent_wizard_sessions' AND policyname = 'agent_wizard_sessions: update own'
  ) THEN
    CREATE POLICY "agent_wizard_sessions: update own"
      ON public.agent_wizard_sessions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── subscriptions ────────────────────────────────────────────────────────────
-- Users can only read their own subscription.
-- Writes are performed exclusively via the Stripe webhook using the service role
-- key, which bypasses RLS — no INSERT/UPDATE policy is needed here.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscriptions' AND policyname = 'subscriptions: select own'
  ) THEN
    CREATE POLICY "subscriptions: select own"
      ON public.subscriptions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── call_logs ────────────────────────────────────────────────────────────────
-- SELECT policy is managed by 007_fix_call_logs_rls.sql.
-- Writes are performed by the Vapi webhook using the service role key.
-- No additional policies needed here.
