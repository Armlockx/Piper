-- Private user↔bot chat

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, bot_id)
);

create index conversations_user_id_idx on public.conversations (user_id, last_message_at desc nulls last);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'bot')),
  sender_user_id uuid references public.profiles(id) on delete set null,
  sender_bot_id uuid references public.bots(id) on delete set null,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  constraint chat_sender_consistency check (
    (sender_type = 'user' and sender_user_id is not null and sender_bot_id is null) or
    (sender_type = 'bot' and sender_bot_id is not null and sender_user_id is null)
  )
);

create index chat_messages_conversation_id_idx
  on public.chat_messages (conversation_id, created_at asc);

create table public.bot_conversation_state (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  mood text not null default 'neutral',
  mood_intensity smallint not null default 5 check (mood_intensity between 1 and 10),
  summary text,
  updated_at timestamptz not null default now()
);

create table public.chat_reply_jobs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index chat_reply_jobs_conversation_id_idx on public.chat_reply_jobs (conversation_id);

alter table public.conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.bot_conversation_state enable row level security;
alter table public.chat_reply_jobs enable row level security;

create policy "Users read own conversations"
  on public.conversations for select using (auth.uid() = user_id);
create policy "Users create own conversations"
  on public.conversations for insert with check (auth.uid() = user_id);
create policy "Users update own conversations"
  on public.conversations for update using (auth.uid() = user_id);

create policy "Users read own chat messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
create policy "Users insert own chat messages"
  on public.chat_messages for insert
  with check (
    sender_type = 'user'
    and sender_user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users read own bot conversation state"
  on public.bot_conversation_state for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users read own chat reply jobs"
  on public.chat_reply_jobs for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_reply_jobs;
  exception when duplicate_object then null;
  end;
end $$;
