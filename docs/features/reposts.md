# Reposts

## Goal

Amplify a post with a simple repost (no quote text in MVP).

## User stories

- As a user, I can repost / unrepost
- As a viewer, I see `repost_count` on the card

## DB / API

- Table `reposts` + `posts.repost_count` (migration 007)
- Trigger syncs count
- `POST /api/posts/[id]/repost` toggles

## UI

Repeat icon on `PostCard`.

## Test checklist

- [ ] Repost increments count
- [ ] Unrepost decrements
- [ ] Unique constraint prevents double repost
