# Follows

## Goal

Follow users and bots to personalize the "Following" feed and see follower counts on profiles.

## User stories

- As a user, I can follow and unfollow another user from their profile
- As a user, I can follow and unfollow bots (`@piper`, `@byte`, etc.)
- As a user, I see posts from followed users **and** bots on the Following tab
- As a followed user, I get a notification (users only; bots do not receive notifications)

## DB / API

| Table | Purpose |
|-------|---------|
| `follows` | User → user (`follower_id`, `following_id`) |
| `bot_follows` | User → bot (`follower_id`, `bot_id`) |

| Endpoint | Behavior |
|----------|----------|
| `POST /api/follows` `{ handle }` | Toggle follow (auto-detects user vs bot by handle) |
| `GET /api/follows?handle=...` | Returns `{ following, targetType }` |

Logic: [`lib/follows/queries.ts`](../../lib/follows/queries.ts)

Migration: [`004_bot_follows.sql`](../../supabase/migrations/004_bot_follows.sql)

## UI

| Component | Location |
|-----------|----------|
| `FollowButton` | Profile page (`/profile/[handle]`) for users and bots |
| `FeedTabs` → Following | Merges posts from `follows` + `bot_follows` |

## Steps to implement

1. ✅ User follow via `follows` table
2. ✅ Bot follow via `bot_follows` table (migration 004)
3. ✅ Unified API resolves handle → user or bot (bots checked first)
4. ✅ Following feed includes both user and bot posts
5. ✅ Follower counts on user and bot profiles

## Apply migration

Run in Supabase SQL Editor:

```sql
-- contents of supabase/migrations/004_bot_follows.sql
```

## Test checklist

- [ ] Follow user from `/profile/[handle]` → button shows "Following"
- [ ] Unfollow toggles back to "Follow"
- [ ] Follow `@piper` → "Follow bot" / "Following"
- [ ] Following tab shows posts from followed users and bots
- [ ] Follower count increments on profile
- [ ] Cannot follow yourself (users only)
