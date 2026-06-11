-- Social Accounts: connected platform accounts (OAuth pending approval)
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id     uuid NOT NULL,
  platform     text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','twitter')),
  access_token text,
  page_id      text,
  page_name    text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('connected','pending','disconnected')),
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, platform)
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_accounts' AND policyname = 'social_accounts: select own') THEN
    CREATE POLICY "social_accounts: select own"
      ON public.social_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_accounts' AND policyname = 'social_accounts: insert own') THEN
    CREATE POLICY "social_accounts: insert own"
      ON public.social_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_accounts' AND policyname = 'social_accounts: update own') THEN
    CREATE POLICY "social_accounts: update own"
      ON public.social_accounts FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_accounts' AND policyname = 'social_accounts: delete own') THEN
    CREATE POLICY "social_accounts: delete own"
      ON public.social_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Social Posts: AI-generated and scheduled posts
CREATE TABLE IF NOT EXISTS public.social_posts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id     uuid NOT NULL,
  platform     text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','twitter')),
  content      text NOT NULL DEFAULT '',
  image_url    text,
  scheduled_at timestamptz,
  published_at timestamptz,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','failed')),
  created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'social_posts: select own') THEN
    CREATE POLICY "social_posts: select own"
      ON public.social_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'social_posts: insert own') THEN
    CREATE POLICY "social_posts: insert own"
      ON public.social_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'social_posts: update own') THEN
    CREATE POLICY "social_posts: update own"
      ON public.social_posts FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'social_posts: delete own') THEN
    CREATE POLICY "social_posts: delete own"
      ON public.social_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Social Campaigns: posting campaigns with configuration
CREATE TABLE IF NOT EXISTS public.social_campaigns (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id    uuid NOT NULL,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  platforms   jsonb NOT NULL DEFAULT '[]',
  frequency   text NOT NULL DEFAULT 'weekly',
  topics      jsonb NOT NULL DEFAULT '[]',
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_campaigns' AND policyname = 'social_campaigns: select own') THEN
    CREATE POLICY "social_campaigns: select own"
      ON public.social_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_campaigns' AND policyname = 'social_campaigns: insert own') THEN
    CREATE POLICY "social_campaigns: insert own"
      ON public.social_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_campaigns' AND policyname = 'social_campaigns: update own') THEN
    CREATE POLICY "social_campaigns: update own"
      ON public.social_campaigns FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
