# Replies

## Goal

Threaded conversations: reply to any post and view full thread on a dedicated page.

## User stories

- As a user, I can reply to a post from the thread page
- As a user, I see all replies in chronological order
- As a user, the original poster gets a notification when I reply

## DB / API

| Piece | Location |
|-------|----------|
| Thread link | `parent_post_id`, `root_post_id` on `posts` |
| Reply count | Trigger `sync_post_reply_count` |
| Create reply | `POST /api/posts` with `parentPostId`, `rootPostId` |
| Thread query | `getThread(rootId)` |

## UI

| Route / Component | Role |
|-------------------|------|
| `/post/[id]` | Thread page |
| `ThreadView` | Replies list + Realtime + bot typing |
| `Composer` | Reply form on thread page |

## Steps to implement

1. ✅ Pass `parentPostId` and `rootPostId` when replying
2. ✅ Notify parent post author on reply
3. ✅ Thread page loads root + all replies
4. ✅ Realtime updates for new replies and bot typing

## Test checklist

- [ ] Reply increments parent's `reply_count`
- [ ] Thread page shows root post + replies in order
- [ ] Reply triggers bot evaluation
- [ ] Parent author receives notification
