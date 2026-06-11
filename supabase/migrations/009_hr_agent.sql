-- HR Knowledge Base: stores uploaded policy/handbook documents per agent
CREATE TABLE IF NOT EXISTS public.hr_knowledge_base (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id   uuid NOT NULL,
  filename   text NOT NULL,
  content    text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.hr_knowledge_base ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_knowledge_base' AND policyname = 'hr_knowledge_base: select own') THEN
    CREATE POLICY "hr_knowledge_base: select own"
      ON public.hr_knowledge_base FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_knowledge_base' AND policyname = 'hr_knowledge_base: insert own') THEN
    CREATE POLICY "hr_knowledge_base: insert own"
      ON public.hr_knowledge_base FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_knowledge_base' AND policyname = 'hr_knowledge_base: delete own') THEN
    CREATE POLICY "hr_knowledge_base: delete own"
      ON public.hr_knowledge_base FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- HR Leave Requests: submitted by employees via the public chat widget
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id       uuid NOT NULL,
  employee_name  text NOT NULL,
  employee_email text NOT NULL,
  leave_type     text NOT NULL,
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  reason         text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at     timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_leave_requests' AND policyname = 'hr_leave_requests: select own') THEN
    CREATE POLICY "hr_leave_requests: select own"
      ON public.hr_leave_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_leave_requests' AND policyname = 'hr_leave_requests: update own') THEN
    CREATE POLICY "hr_leave_requests: update own"
      ON public.hr_leave_requests FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- HR Onboarding Checklists
CREATE TABLE IF NOT EXISTS public.hr_onboarding_checklists (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id        uuid NOT NULL,
  employee_name   text NOT NULL,
  employee_email  text NOT NULL,
  checklist_items jsonb NOT NULL DEFAULT '[]',
  status          text NOT NULL DEFAULT 'pending',
  created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.hr_onboarding_checklists ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_onboarding_checklists' AND policyname = 'hr_onboarding_checklists: select own') THEN
    CREATE POLICY "hr_onboarding_checklists: select own"
      ON public.hr_onboarding_checklists FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_onboarding_checklists' AND policyname = 'hr_onboarding_checklists: insert own') THEN
    CREATE POLICY "hr_onboarding_checklists: insert own"
      ON public.hr_onboarding_checklists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hr_onboarding_checklists' AND policyname = 'hr_onboarding_checklists: update own') THEN
    CREATE POLICY "hr_onboarding_checklists: update own"
      ON public.hr_onboarding_checklists FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
