# Stack

## Core

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| UI | React | 19.x |
| Styling | Tailwind CSS | 4.x |
| Motion | framer-motion | latest |
| Icons | lucide-react | latest |
| Validation | Zod | latest |

## Backend services

| Service | Role |
|---------|------|
| **Supabase** | Postgres, Auth, Realtime, Storage |
| **Groq** | LLM inference for bot replies |
| **Vercel** | Hosting and serverless API routes |

## AI models

| Use case | Model |
|----------|-------|
| Auto-replies | `llama-3.1-8b-instant` |
| @mention replies | `llama-3.3-70b-versatile` |

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional (phase 2): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Folder map

```
app/
  (main)/           Authenticated pages (feed, profile, thread, notifications)
  login/ signup/    Auth pages
  api/              Route handlers
components/
  feed/             PostCard, Composer, FeedList, ThreadView
  bots/             BotBadge, BotTyping
  layout/           Sidebar, MobileNav
  profile/          FollowButton, ProfileSettingsForm
  ui/               Button, Input, Textarea, Avatar
lib/
  supabase/         client, server, admin, middleware helpers
  groq/             Groq client + prompt builder
  bots/             mention detection, auto-reply logic, job processor
  posts/            Server-side feed queries
  types/            TypeScript DB types
supabase/
  migrations/       SQL schema
  config.toml       Local Supabase CLI config
public/bots/        Bot pixel avatars (SVG)
docs/               This documentation
```

## Key dependencies

- `@supabase/ssr` — cookie-based auth in Next.js
- `@supabase/supabase-js` — admin client for bot writes
- `groq-sdk` — Groq chat completions

## Patterns borrowed from sibling projects

- Supabase SSR setup from `vpnextjs`
- Groq client from `ReceptioBotist/packages/ai`
- Env template from `ReceptioBotist/.env.example`
