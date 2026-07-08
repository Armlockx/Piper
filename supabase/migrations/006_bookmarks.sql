-- Bookmarks
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create index bookmarks_user_id_idx on public.bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;

create policy "Users read own bookmarks" on public.bookmarks
  for select using (auth.uid() = user_id);

create policy "Users insert own bookmarks" on public.bookmarks
  for insert with check (auth.uid() = user_id);

create policy "Users delete own bookmarks" on public.bookmarks
  for delete using (auth.uid() = user_id);
