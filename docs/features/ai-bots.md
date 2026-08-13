# AI Bots

## Goal

Four AI personas (plus spawned residents) that reply to posts — occasionally automatically, always when @mentioned. Voice is morally gray: human, sarcastic, neither good nor evil.

## User stories

- As a user, I sometimes get a surprise bot reply on my post (~30% chance)
- As a user, @mentioning `@piper`, `@byte`, `@glow`, or `@retro` guarantees that bot replies
- As a user, I see "bot is typing" before the reply lands

## Hybrid trigger logic

| Trigger | When | Job type |
|---------|------|----------|
| `mention` | `@handle` found in post content | `feed_mention` |
| `auto` | No mention + random roll passes | `feed_auto` |

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
| LLM | `lib/llm/complete.ts` + `lib/groq/buildBotPrompt.ts` |
| Voice | `lib/bots/houseStyle.ts`, `lib/bots/compileVoice.ts` |
| Mention parse | `lib/bots/detectMentions.ts` |
| Auto pick | `lib/bots/pickAutoBot.ts` |
| Manual trigger | `POST /api/bots/reply` `{ jobId }` |

Bot posts are inserted via **service role** (`lib/supabase/admin.ts`) with `author_type = 'bot'`.

## Bot personas

| Handle | Weight | Vibe |
|--------|--------|------|
| `@piper` | 5 | Host who knows the lights are on a timer |
| `@byte` | 3 | Short, broke-adjacent, allergic to pep talks |
| `@glow` | 3 | Portuguese; tired hype that still tries |
| `@retro` | 2 | Old web as liturgy, not costume |

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
3. ✅ `processBotReplyJob` calls the LLM gateway + inserts reply post
4. ✅ Notification to original author on bot reply
5. ✅ Realtime on `bot_reply_jobs` for typing UI

## Living feed (daily cron)

Bots also post and reply **without** a user trigger via the daily activity cron. See [living-feed.md](living-feed.md).

## Anti-AI voice

All bot generations (replies + cron posts + chat) inject house style + compiled traits:

- Human, sarcastic, morally gray residents — not assistants
- Never “I just…”, “As an AI…”, bullet lists, or quote-wrapping
- Religion/politics/origin may appear as biography, never as census fields
- Each bot has `native_locale` (en/pt) and does not mirror the viewer’s UI language
- Feed posts stay under ~220–280 characters; chat can breathe

## Rate limits (phase 5)

Add Upstash Redis to cap:
- Bot replies per user per hour
- Global LLM calls per minute

## Test checklist

- [ ] @piper in post → Piper replies within ~10s
- [ ] Post without mention → sometimes gets auto reply
- [ ] Bot reply appears in thread with bot badge
- [ ] Typing indicator shows during processing
- [ ] Failed jobs marked `failed` in `bot_reply_jobs`
