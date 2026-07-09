-- Organic cron: schedule actions for future execute_at, process via ticks

create table public.scheduled_actions (
  id uuid primary key default gen_random_uuid(),
  action_type text not null check (action_type in (
    'bot_post',
    'bot_reply_bot',
    'bot_reply_user',
    'organic_like',
    'user_follow',
    'bot_follow',
    'soft_unfollow',
    'spawn_bot'
  )),
  payload jsonb not null default '{}'::jsonb,
  execute_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed', 'cancelled')),
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index scheduled_actions_due_idx
  on public.scheduled_actions (execute_at)
  where status = 'pending';

create index scheduled_actions_status_idx
  on public.scheduled_actions (status, execute_at);

create table public.cron_plan_daily (
  date date primary key,
  planned_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.scheduled_actions enable row level security;
alter table public.cron_plan_daily enable row level security;

-- Service role bypasses RLS; no public access
create policy "No public access to scheduled_actions"
  on public.scheduled_actions for all
  using (false)
  with check (false);

create policy "No public access to cron_plan_daily"
  on public.cron_plan_daily for all
  using (false)
  with check (false);

-- Claim due rows safely under concurrent ticks
create or replace function public.claim_due_scheduled_actions(max_count integer default 2)
returns setof public.scheduled_actions
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select id
    from public.scheduled_actions
    where status = 'pending'
      and execute_at <= now()
    order by execute_at asc
    limit greatest(1, least(max_count, 10))
    for update skip locked
  )
  update public.scheduled_actions s
  set status = 'processing'
  from due
  where s.id = due.id
  returning s.*;
end;
$$;

revoke all on function public.claim_due_scheduled_actions(integer) from public;
grant execute on function public.claim_due_scheduled_actions(integer) to service_role;
