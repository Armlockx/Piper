# Realtime

## Goal

Live updates across the feed, threads, notifications, and (later) chat — via Supabase Realtime `postgres_changes`.

## Architecture

Shared hooks live in `lib/realtime/`:

| Hook | Role |
|------|------|
| `usePostgresChanges` | Generic channel + cleanup + CHANNEL_ERROR log |
| `useFeedRealtime` | New top-level posts; filters Following via follows/bot_follows |
| `useThreadRealtime` | Thread replies + bot typing (`root_post_id` filter) |
| `useNotificationCount` / `useNotificationList` | Live badge + list |
| `usePostCounters` | Live `like_count` / `reply_count` / `repost_count` |

## Publication tables

| Table | Events used |
|-------|-------------|
| `posts` | INSERT (feed/thread), UPDATE (counters) |
| `notifications` | INSERT |
| `bot_reply_jobs` | INSERT (typing; filtered by `root_post_id`) |
| `post_likes` | published for future use |
| `reposts` | published for future use |
| `chat_messages` | INSERT (chat) |
| `chat_reply_jobs` | INSERT (chat typing) |

## Fixes (migration 009)

- `bot_reply_jobs.root_post_id` for precise typing filters
- `post_likes` + `reposts` added to `supabase_realtime`
