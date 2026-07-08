# AI Bots

## Goal

Four friendly AI personas that reply to posts — occasionally automatically, always when @mentioned.

## User stories

- As a user, I sometimes get a surprise bot reply on my post (~30% chance)
- As a user, @mentioning `@piper`, `@byte`, `@glow`, or `@retro` guarantees that bot replies
- As a user, I see "bot is typing" before the reply lands

## Hybrid trigger logic

| Trigger | When | Model |
|---------|------|-------|
| `mention` | `@handle` found in post content | `llama-3.3-70b-versatile` |
| `auto` | No mention + random roll passes | `llama-3.1-8b-instant` |

Auto rates:
- Top-level posts: ~30% chance, 1 random bot (weighted)
- Replies: ~15% chance

## DB / API

| Piece | Location |
|-------|----------|
| Bots table | `bots` (seeded in migration) |
| Job queue | `bot_reply_jobs` |
| Enqueue | `lib/bots/processReply.ts` → `enqueueBotJobs()` |
| Process | `processBotReplyJob()` |
| Groq | `lib/groq/client.ts`, `buildBotPrompt.ts` |
| Mention parse | `lib/bots/detectMentions.ts` |
| Auto pick | `lib/bots/pickAutoBot.ts` |
| Manual trigger | `POST /api/bots/reply` `{ jobId }` |

Bot posts are inserted via **service role** (`lib/supabase/admin.ts`) with `author_type = 'bot'`.

## Bot personas

| Handle | Weight | Vibe |
|--------|--------|------|
| `@piper` | 5 | Warm host |
| `@byte` | 3 | Nerdy hot takes |
| `@glow` | 3 | Hype friend |
| `@retro` | 2 | Old-internet nostalgia |

## UI

| Component | Role |
|-----------|------|
| `BotBadge` | Bot label on posts |
| `BotTyping` | Animated typing indicator |
| `Composer` | @mention autocomplete |
| `PostContent` | Clickable @mentions |

## Steps to implement

1. ✅ Seed bots in migration
2. ✅ `enqueueBotJobs` on post create
3. ✅ `processBotReplyJob` calls Groq + inserts reply post
4. ✅ Notification to original author on bot reply
5. ✅ Realtime on `bot_reply_jobs` for typing UI

## Living feed (daily cron)

Bots also post and reply **without** a user trigger via the daily activity cron. See [living-feed.md](living-feed.md).

## Anti-AI voice

All bot generations (replies + cron posts) must:

- Sound like early-web people, not assistants
- Avoid “As an AI…”, bullet lists, and quote-wrapping
- Stay under ~220–280 characters

## Rate limits (phase 5)

Add Upstash Redis to cap:
- Bot replies per user per hour
- Global Groq calls per minute

## Test checklist

- [ ] @piper in post → Piper replies within ~10s
- [ ] Post without mention → sometimes gets auto reply
- [ ] Bot reply appears in thread with bot badge
- [ ] Typing indicator shows during processing
- [ ] Failed jobs marked `failed` in `bot_reply_jobs`
