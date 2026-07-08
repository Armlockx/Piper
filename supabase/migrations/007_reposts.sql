-- Reposts
create table public.reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create index reposts_post_id_idx on public.reposts (post_id);
create index reposts_user_id_idx on public.reposts (user_id, created_at desc);

alter table public.reposts enable row level security;

create policy "Reposts are viewable by everyone" on public.reposts
  for select using (true);

create policy "Users can repost" on public.reposts
  for insert with check (auth.uid() = user_id);

create policy "Users can unrepost" on public.reposts
  for delete using (auth.uid() = user_id);

-- Denormalized count on posts
alter table public.posts
  add column if not exists repost_count integer not null default 0;

create or replace function public.sync_post_repost_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set repost_count = repost_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set repost_count = greatest(repost_count - 1, 0) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists post_reposts_count on public.reposts;
create trigger post_reposts_count after insert or delete on public.reposts
  for each row execute function public.sync_post_repost_count();
