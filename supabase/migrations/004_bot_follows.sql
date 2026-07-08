-- Follow bots (users follow bots; bots cannot follow back via this table)
create table public.bot_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, bot_id)
);

create index bot_follows_follower_id_idx on public.bot_follows (follower_id);
create index bot_follows_bot_id_idx on public.bot_follows (bot_id);

alter table public.bot_follows enable row level security;

create policy "Bot follows are viewable by everyone" on public.bot_follows
  for select using (true);

create policy "Users can follow bots" on public.bot_follows
  for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow bots" on public.bot_follows
  for delete using (auth.uid() = follower_id);

-- Optional: track bot follow in notifications (no user_id target for bot — skip notification on bot follow)
