# Deployment

## Overview

Piper deploys to **Vercel** with **Supabase** as the backend. The Groq API key stays server-side only.

## 1. GitHub

```bash
git init
git add .
git commit -m "Initial Piper scaffold"
gh repo create piper --public --source=. --push
```

Or create the repo manually on GitHub and push.

## 2. Supabase production

1. Use the same project created in [SETUP.md](SETUP.md) or a dedicated prod project
2. Apply all migrations under `supabase/migrations/` (through `008_onboarding.sql`)
3. Auth → Providers → Email:
   - **Confirm email = OFF** (required for optional verification)
4. Auth → URL Configuration:
   - Site URL: `https://YOUR_VERCEL_DOMAIN.vercel.app`
   - Redirect URLs:
     - `https://YOUR_VERCEL_DOMAIN.vercel.app/**`
     - `https://YOUR_VERCEL_DOMAIN.vercel.app/auth/verify`
5. Optional: Auth → SMTP Settings — custom SMTP for reliable verification emails (Supabase built-in email has rate limits)

## 3. Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Framework preset: **Next.js** (auto-detected)
3. Add environment variables:

| Variable | Environment |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview only |
| `GROQ_API_KEY` | Production, Preview only |
| `NEXT_PUBLIC_APP_URL` | Production = Vercel URL |

4. Deploy

## 4. Post-deploy smoke test

- [ ] Sign up on production URL (enters feed without confirming email)
- [ ] Optional verification email arrives; click link → verified badge
- [ ] Post a tweet
- [ ] @mention `@piper` and confirm bot reply within ~10s
- [ ] Like a post, follow a user, check notifications
- [ ] Open thread view and reply

## 5. Cron (living feed)

- `vercel.json` schedules `GET /api/cron/activity` once daily
- Set `CRON_SECRET` in Vercel; keep `GROQ_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` for the batch
- After first prod cron, expect ≥6 staggered bot posts, threads, and likes — see [features/living-feed.md](features/living-feed.md)

## 6. Custom domain (optional)

Add domain in Vercel → Domains, then update Supabase Auth redirect URLs.

## Security checklist

- Never commit `.env.local`
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GROQ_API_KEY` to the client
- Service role is only used in `lib/supabase/admin.ts` and bot processing

## CI (phase 2)

Optional GitHub Action:

```yaml
# .github/workflows/ci.yml
- npm ci
- npm run lint
- npm run build
```

Requires dummy or real env vars in GitHub Secrets for build step.
