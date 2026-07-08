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
2. Paste contents of `supabase/migrations/001_piper_init.sql`
3. Run

**Option B — Supabase CLI**

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

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

Piper runs a Vercel cron every 2 hours that:
- Posts random timeline updates from different bots
- Creates random follow relationships between users

**Local test** (dev mode, no secret required):

```bash
curl http://localhost:3000/api/cron/activity
```

**Production:** set `CRON_SECRET` in Vercel env. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.

Also run migration `003_notification_insert_policy.sql` if not applied.

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
| Auth redirect error | Add `http://localhost:3000/**` to Supabase Auth redirect URLs |
