-- CRM Agent tables
-- Idempotent: safe to re-run

-- crm_contacts
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id    uuid,
  name        text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  company     text NOT NULL DEFAULT '',
  source      text NOT NULL DEFAULT 'manual'
                CHECK (source IN ('voice_agent', 'form', 'manual')),
  pipeline_stage text NOT NULL DEFAULT 'New Lead',
  notes       text NOT NULL DEFAULT '',
  tags        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

-- crm_pipeline_stages
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id    uuid,
  name        text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  color       text NOT NULL DEFAULT '#6b7280',
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- crm_interactions
CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id  uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'note'
                CHECK (type IN ('call', 'email', 'sms', 'note')),
  content     text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- crm_follow_ups
CREATE TABLE IF NOT EXISTS public.crm_follow_ups (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id   uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  message      text NOT NULL DEFAULT '',
  channel      text NOT NULL DEFAULT 'email'
                 CHECK (channel IN ('email', 'sms', 'both')),
  scheduled_at timestamptz,
  sent_at      timestamptz,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'sent', 'failed')),
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS crm_contacts_user_id_idx       ON public.crm_contacts(user_id);
CREATE INDEX IF NOT EXISTS crm_contacts_stage_idx          ON public.crm_contacts(user_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS crm_pipeline_stages_user_id_idx ON public.crm_pipeline_stages(user_id, order_index);
CREATE INDEX IF NOT EXISTS crm_interactions_contact_id_idx ON public.crm_interactions(contact_id);
CREATE INDEX IF NOT EXISTS crm_follow_ups_user_id_idx      ON public.crm_follow_ups(user_id, status);

-- RLS
ALTER TABLE public.crm_contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_follow_ups      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_contacts' AND policyname = 'crm_contacts_owner') THEN
    CREATE POLICY crm_contacts_owner ON public.crm_contacts
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_pipeline_stages' AND policyname = 'crm_pipeline_stages_owner') THEN
    CREATE POLICY crm_pipeline_stages_owner ON public.crm_pipeline_stages
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_interactions' AND policyname = 'crm_interactions_owner') THEN
    CREATE POLICY crm_interactions_owner ON public.crm_interactions
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_follow_ups' AND policyname = 'crm_follow_ups_owner') THEN
    CREATE POLICY crm_follow_ups_owner ON public.crm_follow_ups
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
