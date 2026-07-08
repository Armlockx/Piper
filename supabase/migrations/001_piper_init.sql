-- Piper initial schema

create extension if not exists "pgcrypto";

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint handle_format check (handle ~ '^[a-zA-Z0-9_]{3,20}$')
);

-- Bots
create table public.bots (
  id uuid primary key default gen_random_uuid(),
  handle text unique not null,
  name text not null,
  persona_prompt text not null,
  avatar_url text not null,
  accent_color text not null default '#00ffd5',
  auto_reply_weight integer not null default 1,
  created_at timestamptz not null default now(),
  constraint bot_handle_format check (handle ~ '^[a-zA-Z0-9_]{2,20}$')
);

-- Posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  author_type text not null check (author_type in ('user', 'bot')),
  author_id uuid references public.profiles(id) on delete set null,
  bot_id uuid references public.bots(id) on delete set null,
  parent_post_id uuid references public.posts(id) on delete cascade,
  root_post_id uuid references public.posts(id) on delete cascade,
  like_count integer not null default 0,
  reply_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_length check (char_length(content) between 1 and 280),
  constraint author_consistency check (
    (author_type = 'user' and author_id is not null and bot_id is null) or
    (author_type = 'bot' and bot_id is not null and author_id is null)
  )
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_root_post_id_idx on public.posts (root_post_id);
create index posts_parent_post_id_idx on public.posts (parent_post_id);
create index posts_author_id_idx on public.posts (author_id);

-- Likes
create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

-- Follows
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  bot_id uuid references public.bots(id) on delete set null,
  type text not null check (type in ('like', 'reply', 'follow', 'bot_reply')),
  post_id uuid references public.posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

-- Bot reply jobs
create table public.bot_reply_jobs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  trigger text not null check (trigger in ('auto', 'mention')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (post_id, bot_id, trigger)
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- Profile bootstrap on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_handle text;
  final_handle text;
  suffix int := 0;
begin
  base_handle := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  if length(base_handle) < 3 then
    base_handle := 'user' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  final_handle := base_handle;

  while exists (select 1 from public.profiles where handle = final_handle) loop
    suffix := suffix + 1;
    final_handle := base_handle || suffix::text;
  end loop;

  insert into public.profiles (id, handle, display_name)
  values (new.id, final_handle, coalesce(new.raw_user_meta_data->>'display_name', final_handle));

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Like count sync
create or replace function public.sync_post_like_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger post_likes_count after insert or delete on public.post_likes
  for each row execute function public.sync_post_like_count();

-- Reply count sync
create or replace function public.sync_post_reply_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' and new.parent_post_id is not null then
    update public.posts set reply_count = reply_count + 1 where id = new.parent_post_id;
    if new.root_post_id is not null and new.root_post_id <> new.parent_post_id then
      update public.posts set reply_count = reply_count + 1 where id = new.root_post_id;
    end if;
  elsif tg_op = 'DELETE' and old.parent_post_id is not null then
    update public.posts set reply_count = greatest(reply_count - 1, 0) where id = old.parent_post_id;
    if old.root_post_id is not null and old.root_post_id <> old.parent_post_id then
      update public.posts set reply_count = greatest(reply_count - 1, 0) where id = old.root_post_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger posts_reply_count after insert or delete on public.posts
  for each row execute function public.sync_post_reply_count();

-- RLS
alter table public.profiles enable row level security;
alter table public.bots enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.bot_reply_jobs enable row level security;

-- Profiles policies
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Bots policies
create policy "Bots are viewable by everyone" on public.bots for select using (true);

-- Posts policies
create policy "Posts are viewable by everyone" on public.posts for select using (true);
create policy "Users can insert own posts" on public.posts for insert
  with check (auth.uid() = author_id and author_type = 'user');
create policy "Users can delete own posts" on public.posts for delete
  using (auth.uid() = author_id and author_type = 'user');

-- Likes policies
create policy "Likes are viewable by everyone" on public.post_likes for select using (true);
create policy "Users can like posts" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike posts" on public.post_likes for delete using (auth.uid() = user_id);

-- Follows policies
create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Users can follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- Notifications policies
create policy "Users read own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- Bot jobs: public read for typing indicator; writes via service role only
create policy "Bot jobs viewable for typing UI" on public.bot_reply_jobs for select using (true);

-- Realtime
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.bot_reply_jobs;

-- Storage for avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users can upload own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Seed bots
insert into public.bots (handle, name, persona_prompt, avatar_url, accent_color, auto_reply_weight) values
(
  'piper',
  'Piper',
  'You are Piper, the friendly host of this retro social network. You welcome newcomers, ask curious questions, and keep the vibe warm and inclusive. You speak like a cozy pixel-art guide from the early web.',
  '/bots/piper.svg',
  '#00ffd5',
  5
),
(
  'byte',
  'Byte',
  'You are Byte, a nerdy bot who loves tech, code, and clever one-liners. Your replies are sharp, witty, and slightly geeky. You keep things short and punchy.',
  '/bots/byte.svg',
  '#ff006e',
  3
),
(
  'glow',
  'Glow',
  'You are Glow, the hype friend. You encourage people, celebrate small wins, and bring positive energy. Light on emojis, heavy on warmth.',
  '/bots/glow.svg',
  '#ffbe0b',
  3
),
(
  'retro',
  'Retro',
  'You are Retro, obsessed with old internet culture — dial-up, forums, guestbooks, and pixel art. You drop playful references and speak like it is 1999 but kind.',
  '/bots/retro.svg',
  '#8338ec',
  2
);

-- Welcome post from Piper (runs after bots exist)
insert into public.posts (content, author_type, bot_id, root_post_id)
select
  'Hey there! I''m Piper — your retro social host. Post something, @mention us bots, and we''ll chime in. Welcome to the feed!',
  'bot',
  id,
  null
from public.bots where handle = 'piper';

update public.posts set root_post_id = id where author_type = 'bot' and root_post_id is null;
