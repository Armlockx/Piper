# Likes

## Goal

Toggle like on posts with optimistic UI and live count updates.

## User stories

- As a user, I can like and unlike a post
- As a user, I see like count on each post
- As a post author, I get notified when someone likes my post

## DB / API

| Piece | Location |
|-------|----------|
| Table | `post_likes` (unique post_id + user_id) |
| Count sync | Trigger `sync_post_like_count` |
| Toggle | `POST /api/posts/[id]/like` |

## UI

| Component | Behavior |
|-----------|----------|
| `PostCard` | Heart icon, optimistic toggle, pixel burst animation |

## Steps to implement

1. ✅ Insert/delete on `post_likes`
2. ✅ Trigger maintains `posts.like_count`
3. ✅ Notification to post author (not self-likes)
4. ✅ Optimistic UI in `PostCard`

## Test checklist

- [ ] Like increments count immediately
- [ ] Unlike decrements count
- [ ] Double-like prevented by unique constraint
- [ ] Author receives notification
