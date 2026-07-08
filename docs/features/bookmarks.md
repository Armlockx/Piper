# Bookmarks

## Goal

Save posts to revisit later.

## User stories

- As a user, I can bookmark / unbookmark from a post card
- As a user, I see saved posts on `/bookmarks`

## DB / API

- Table `bookmarks` (migration 006)
- `POST /api/posts/[id]/bookmark` toggles

## UI

Bookmark icon on `PostCard`; nav link “Saved”.

## Test checklist

- [ ] Toggle bookmark persists after refresh
- [ ] `/bookmarks` lists saved posts
- [ ] Guest redirected to login
