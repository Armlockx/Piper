-- Allow authenticated users to create notifications when they are the actor
create policy "Actors can insert notifications" on public.notifications
  for insert with check (auth.uid() = actor_id);
