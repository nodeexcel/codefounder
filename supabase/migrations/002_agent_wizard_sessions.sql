-- Voice / agent onboarding wizard progress

create table if not exists public.agent_wizard_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  agent_type text not null default 'voice',
  current_step integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'live')),
  business_details jsonb not null default '{}'::jsonb,
  voice_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, agent_type)
);

create index if not exists agent_wizard_sessions_user_id_idx
  on public.agent_wizard_sessions (user_id);

alter table public.agent_wizard_sessions enable row level security;

create policy "Users can view own wizard sessions"
  on public.agent_wizard_sessions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own wizard sessions"
  on public.agent_wizard_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own wizard sessions"
  on public.agent_wizard_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own wizard sessions"
  on public.agent_wizard_sessions
  for delete
  using (auth.uid() = user_id);
