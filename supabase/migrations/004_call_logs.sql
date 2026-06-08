-- Call logs recorded by the Vapi webhook after each call ends

create table if not exists public.call_logs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references auth.users (id) on delete cascade,
  agent_id     text,
  call_id      text        not null unique,
  caller_number text,
  duration     integer,    -- seconds
  transcript   text,
  recording_url text,
  status       text        not null default 'ended',
  created_at   timestamptz not null default now()
);

create index if not exists call_logs_user_id_idx    on public.call_logs (user_id);
create index if not exists call_logs_created_at_idx on public.call_logs (created_at desc);
create index if not exists call_logs_call_id_idx    on public.call_logs (call_id);

alter table public.call_logs enable row level security;

-- Authenticated users can see their own calls plus unattributed calls (user_id IS NULL)
create policy "Users can view own call_logs"
  on public.call_logs
  for select
  to authenticated
  using (user_id is null or auth.uid() = user_id);

-- Service role (webhook) bypasses RLS by default — no insert policy needed
