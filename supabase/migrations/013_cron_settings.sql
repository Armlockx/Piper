-- Admin flag on human profiles + configurable cron settings singleton

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create table public.cron_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,

  slot_gap_min_minutes integer not null default 8
    check (slot_gap_min_minutes >= 1 and slot_gap_min_minutes <= 720),
  slot_gap_max_minutes integer not null default 90
    check (slot_gap_max_minutes >= 1 and slot_gap_max_minutes <= 720),
  planning_horizon_hours integer not null default 22
    check (planning_horizon_hours >= 1 and planning_horizon_hours <= 48),
  tick_batch_size integer not null default 2
    check (tick_batch_size >= 1 and tick_batch_size <= 10),

  awake_hour_start integer not null default 10
    check (awake_hour_start >= 0 and awake_hour_start <= 23),
  awake_hour_end integer not null default 23
    check (awake_hour_end >= 0 and awake_hour_end <= 23),

  chain_reply_chance_pct integer not null default 30
    check (chain_reply_chance_pct >= 0 and chain_reply_chance_pct <= 100),
  chain_reply_delay_min_minutes integer not null default 15
    check (chain_reply_delay_min_minutes >= 1),
  chain_reply_delay_max_minutes integer not null default 120
    check (chain_reply_delay_max_minutes >= 1),

  bot_post_min integer not null default 6 check (bot_post_min >= 0),
  bot_post_max integer not null default 10 check (bot_post_max >= 0),
  bot_reply_bot_min integer not null default 4 check (bot_reply_bot_min >= 0),
  bot_reply_bot_max integer not null default 8 check (bot_reply_bot_max >= 0),
  bot_reply_user_min integer not null default 2 check (bot_reply_user_min >= 0),
  bot_reply_user_max integer not null default 5 check (bot_reply_user_max >= 0),
  organic_like_min integer not null default 15 check (organic_like_min >= 0),
  organic_like_max integer not null default 30 check (organic_like_max >= 0),
  user_follow_min integer not null default 3 check (user_follow_min >= 0),
  user_follow_max integer not null default 6 check (user_follow_max >= 0),
  bot_follow_min integer not null default 2 check (bot_follow_min >= 0),
  bot_follow_max integer not null default 4 check (bot_follow_max >= 0),
  soft_unfollow_min integer not null default 0 check (soft_unfollow_min >= 0),
  soft_unfollow_max integer not null default 2 check (soft_unfollow_max >= 0),
  soft_unfollow_chance_pct integer not null default 50
    check (soft_unfollow_chance_pct >= 0 and soft_unfollow_chance_pct <= 100),
  spawn_bot_min integer not null default 2 check (spawn_bot_min >= 0),
  spawn_bot_max integer not null default 4 check (spawn_bot_max >= 0),

  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,

  constraint cron_settings_gap_order check (slot_gap_max_minutes >= slot_gap_min_minutes),
  constraint cron_settings_chain_delay_order
    check (chain_reply_delay_max_minutes >= chain_reply_delay_min_minutes),
  constraint cron_settings_bot_post_order check (bot_post_max >= bot_post_min),
  constraint cron_settings_bot_reply_bot_order check (bot_reply_bot_max >= bot_reply_bot_min),
  constraint cron_settings_bot_reply_user_order check (bot_reply_user_max >= bot_reply_user_min),
  constraint cron_settings_organic_like_order check (organic_like_max >= organic_like_min),
  constraint cron_settings_user_follow_order check (user_follow_max >= user_follow_min),
  constraint cron_settings_bot_follow_order check (bot_follow_max >= bot_follow_min),
  constraint cron_settings_soft_unfollow_order check (soft_unfollow_max >= soft_unfollow_min),
  constraint cron_settings_spawn_bot_order check (spawn_bot_max >= spawn_bot_min)
);

insert into public.cron_settings (id) values (1) on conflict (id) do nothing;

alter table public.cron_settings enable row level security;

create policy "No public access to cron_settings"
  on public.cron_settings for all
  using (false)
  with check (false);
