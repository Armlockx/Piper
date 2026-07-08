-- Backfill profiles for users created before migration / trigger
insert into public.profiles (id, handle, display_name)
select
  u.id,
  coalesce(
    nullif(
      lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')),
      ''
    ),
    'user' || substr(replace(u.id::text, '-', ''), 1, 6)
  ),
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Resolve duplicate handles from backfill
do $$
declare
  r record;
  suffix int;
  new_handle text;
begin
  for r in
    select id, handle from public.profiles
    where handle in (
      select handle from public.profiles group by handle having count(*) > 1
    )
    order by created_at
    offset 1
  loop
    suffix := 1;
    new_handle := r.handle || suffix::text;
    while exists (select 1 from public.profiles where handle = new_handle) loop
      suffix := suffix + 1;
      new_handle := r.handle || suffix::text;
    end loop;
    update public.profiles set handle = new_handle where id = r.id;
  end loop;
end $$;

-- Allow users to create their own profile if trigger missed (belt and suspenders)
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
