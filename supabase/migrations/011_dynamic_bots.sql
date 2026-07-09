-- Dynamic bot spawning

alter table public.bots
  add column if not exists is_generated boolean not null default false;

alter table public.bots
  add column if not exists archetype text;

alter table public.bots
  add column if not exists spawn_batch_id uuid;

alter table public.bots
  add column if not exists active boolean not null default true;

create table public.bot_spawn_daily (
  date date primary key,
  spawned_count integer not null default 0,
  daily_cap integer not null,
  last_spawn_at timestamptz
);

-- Only active bots participate in public auto-replies by default (app filters)
create index if not exists bots_active_idx on public.bots (active) where active = true;
