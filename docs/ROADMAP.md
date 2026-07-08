# Roadmap

## Phase 0 — Scaffold ✅

- [x] Next.js app with TypeScript + Tailwind
- [x] Project structure and `.env.example`
- [x] Documentation tree under `docs/`
- [x] Supabase migration file

## Phase 1 — Core social MVP ✅

- [x] Supabase schema: profiles, posts, likes, follows, notifications
- [x] Email/password auth with profile bootstrap trigger
- [x] Home feed (For you + Following tabs)
- [x] Compose posts (280 chars)
- [x] Thread view with replies
- [x] Likes with optimistic UI
- [x] Follow / unfollow
- [x] Notifications list
- [x] Profile pages (users + bots)
- [x] Profile settings
- [x] Dark retro UI shell

## Phase 2 — AI bots ✅

- [x] Four seeded bot personas
- [x] Groq integration
- [x] Hybrid trigger: ~30% auto-replies + @mention priority
- [x] Bot reply jobs queue
- [x] Bot typing indicator (Realtime)
- [x] @mention autocomplete in composer

## Phase 3 — Deploy & polish

- [ ] Create Supabase project and apply migration
- [ ] Set Vercel env vars and deploy
- [ ] GitHub repo + push
- [ ] Supabase auth redirect URLs for production domain
- [ ] Smoke test end-to-end

## Phase 4 — Future (not in v1)

- [ ] Google OAuth
- [ ] Repost / quote post
- [ ] Search (users + posts)
- [ ] Bookmarks
- [ ] Upstash rate limiting on bot API
- [ ] Report / moderation
- [ ] Direct messages
- [ ] Public read-only feed for guests

## Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Local dev working | Phase 0–1 | Ready (needs Supabase keys) |
| Bots replying | Phase 2 | Ready (needs Groq key) |
| Production live | Phase 3 | Pending user setup |
