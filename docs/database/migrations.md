# Migrations

## File

[`supabase/migrations/001_piper_init.sql`](../../supabase/migrations/001_piper_init.sql)

Creates the full Piper schema: tables, triggers, RLS, Realtime, storage bucket, bot seeds, welcome post.

## Apply migration

### Supabase Dashboard

1. SQL Editor → New query
2. Paste full migration file
3. Run

### Supabase CLI

```bash
# Link to your project (one time)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### Local Supabase (optional)

```bash
supabase start
supabase db reset   # applies all migrations
```

## Generate TypeScript types

After local Supabase is running or linked to remote:

```bash
npm run db:types
```

Output: `lib/types/supabase.generated.ts`

Manual types also exist in `lib/types/database.ts` for use before typegen.

## Adding new migrations

1. Create `supabase/migrations/002_description.sql`
2. Test locally with `supabase db reset`
3. Push with `supabase db push`
4. Regenerate types with `npm run db:types`
5. Update [schema.md](schema.md)

## Rollback

Supabase does not auto-rollback. Write a down migration manually if needed, or restore from backup in Dashboard.

## Realtime checklist after migration

Verify in Dashboard → Database → Replication:

- [x] `posts`
- [x] `notifications`
- [ ] `bot_reply_jobs` (add manually if not present)

```sql
alter publication supabase_realtime add table public.bot_reply_jobs;
```
