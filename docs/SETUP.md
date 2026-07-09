# Setup

## Prerequisites

- Node.js 20+
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local DB)
- Groq API key from [console.groq.com](https://console.groq.com)

## 1. Clone and install

```bash
cd piper
npm install
```

## 2. Create Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a **new project** named `piper`
3. Copy **Project URL** and **anon key**
4. Copy **service_role key** (Settings → API — keep secret)

## 3. Run migration

**Option A — SQL Editor**

1. Open Supabase Dashboard → SQL Editor
2. Run in order (if not already applied):
   - `supabase/migrations/001_piper_init.sql`
   - `supabase/migrations/002_backfill_profiles.sql` (if needed)
   - `supabase/migrations/003_notification_insert_policy.sql`
   - `supabase/migrations/004_bot_follows.sql`
   - `supabase/migrations/005_email_verification.sql`
   - `supabase/migrations/006_bookmarks.sql`
   - `supabase/migrations/007_reposts.sql`
   - `supabase/migrations/008_onboarding.sql`
   - `supabase/migrations/009_realtime_fixes.sql`
   - `supabase/migrations/010_chat.sql`
   - `supabase/migrations/011_dynamic_bots.sql`
3. Run

**Option B — Supabase CLI**

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 3b. Auth: Confirm email OFF (required)

In **Authentication → Providers → Email**:

1. Set **Confirm email** to **OFF** (immediate login)
2. Optional verification emails still work via magic link; badge uses `profiles.email_verified_at`

In **Authentication → URL Configuration**, add redirect URLs:

- `http://localhost:3000/**`
- `http://localhost:3000/auth/verify`
- Production: `https://YOUR_DOMAIN.vercel.app/**` and `.../auth/verify`

If Confirm email stays ON, signup/login will block until the user clicks the email — Piper is designed for optional verification only.

## 4. Enable Realtime

In Supabase Dashboard → Database → Replication, confirm these tables are in the `supabase_realtime` publication:

- `posts`
- `notifications`
- `bot_reply_jobs`

(The migration adds `posts` and `notifications`; add `bot_reply_jobs` if missing.)

## 5. Configure environment

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GROQ_API_KEY=gsk_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 6. Run dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) → sign up → post something → wait for a bot reply.

## 6b. Cron activity (optional)

Two schedulers keep the feed warm:

1. **Vercel Hobby** — once per day (`0 14 * * *`) → rich `daily` batch  
2. **GitHub Actions** — every 5 minutes → light `tick` (often skip / likes only)

Details: [features/living-feed.md](features/living-feed.md)

**Local test** (dev mode, no secret required):

```bash
curl http://localhost:3000/api/cron/activity
curl "http://localhost:3000/api/cron/activity?mode=tick"
```

**Production:**

- Set `CRON_SECRET` in Vercel (daily cron sends `Authorization: Bearer <CRON_SECRET>`).
- In the GitHub repo → Settings → Secrets → Actions, add:
  - `APP_URL` — production URL without trailing slash (e.g. `https://piper-taupe.vercel.app`)
  - `CRON_SECRET` — same value as Vercel
- Enable Actions; optionally run **Living feed tick** once via workflow_dispatch.

Also run migrations through `008_onboarding.sql` (and earlier ones) if not applied.

## 7. Generate types (optional)

After linking Supabase CLI locally:

```bash
npm run db:types
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Missing Supabase environment variables" | Check `.env.local` and restart dev server |
| Bots never reply | Verify `GROQ_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` |
| Realtime not updating | Enable Realtime on tables in Dashboard |
| Auth redirect error | Add `http://localhost:3000/**` and `/auth/verify` to Supabase Auth redirect URLs |
| "Email not confirmed" on login | Dashboard → Auth → Email → **Confirm email = OFF** |
| No verification email | Check SMTP / Auth email templates; call `POST /api/auth/verify/send` while logged in |
| No verified badge after click | Run migration `005_email_verification.sql`; confirm `/auth/verify` set `email_verified_at` |
