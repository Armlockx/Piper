# Migrations

## File list

| File | Purpose |
|------|---------|
| `001_piper_init.sql` | Core schema, bots, welcome post |
| `002_backfill_profiles.sql` | Backfill profiles + insert policy |
| `003_notification_insert_policy.sql` | Actors can insert notifications |
| `004_bot_follows.sql` | User → bot follows |
| `005_email_verification.sql` | Optional verify columns |
| `006_bookmarks.sql` | Bookmarks |
| `007_reposts.sql` | Reposts + repost_count |
| `008_onboarding.sql` | `onboarding_done` flag |

## Apply migration

### Supabase Dashboard

1. SQL Editor → New query
2. Paste each migration file in order (001 → 008)
3. Run

### Supabase CLI

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Local Supabase (optional)

```bash
supabase start
supabase db reset
```

## Generate TypeScript types

```bash
npm run db:types
```

Manual types live in `lib/types/database.ts`.

## Adding new migrations

1. Create `supabase/migrations/00N_description.sql`
2. Test with `supabase db reset`
3. Push with `supabase db push`
4. Update [schema.md](schema.md)

## Realtime checklist

- `posts`
- `notifications`
- `bot_reply_jobs` (add if missing)

```sql
alter publication supabase_realtime add table public.bot_reply_jobs;
```
