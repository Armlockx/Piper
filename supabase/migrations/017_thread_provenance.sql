-- Thread provenance, cron job trigger, and leftover tree hygiene

alter table public.posts
  add column if not exists reply_source text
  check (reply_source is null or reply_source in ('user', 'bot_mention', 'bot_auto', 'bot_cron'));

do $$
declare
  conname text;
begin
  select con.conname into conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'bot_reply_jobs'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%trigger%'
    and pg_get_constraintdef(con.oid) like '%auto%'
  limit 1;

  if conname is not null then
    execute format('alter table public.bot_reply_jobs drop constraint %I', conname);
  end if;
end $$;

alter table public.bot_reply_jobs
  drop constraint if exists bot_reply_jobs_trigger_check;

alter table public.bot_reply_jobs
  add constraint bot_reply_jobs_trigger_check
  check (trigger in ('auto', 'mention', 'cron'));

-- Hygiene: repair leftover null roots on jobs (009 leftover)
update public.bot_reply_jobs j
set root_post_id = coalesce(p.root_post_id, p.id)
from public.posts p
where j.post_id = p.id
  and j.root_post_id is null;

-- Hygiene: repair reply tree roots
update public.posts p
set root_post_id = coalesce(parent.root_post_id, parent.id)
from public.posts parent
where p.parent_post_id = parent.id
  and (
    p.root_post_id is null
    or p.root_post_id is distinct from coalesce(parent.root_post_id, parent.id)
  );
