-- Realtime fixes: filterable bot jobs + live social counters

alter table public.bot_reply_jobs
  add column if not exists root_post_id uuid references public.posts(id) on delete cascade;

create index if not exists bot_reply_jobs_root_post_id_idx
  on public.bot_reply_jobs (root_post_id);

-- Backfill from target posts
update public.bot_reply_jobs j
set root_post_id = coalesce(p.root_post_id, p.id)
from public.posts p
where j.post_id = p.id
  and j.root_post_id is null;

-- Live like/repost events for counters (idempotent)
do $$
begin
  begin
    alter publication supabase_realtime add table public.post_likes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.reposts;
  exception when duplicate_object then null;
  end;
end $$;
