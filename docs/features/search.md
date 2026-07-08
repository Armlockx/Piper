# Search

## Goal

Find people, bots, and posts from one place.

## User stories

- As a user, I can search by handle or display name
- As a user, I can search post content
- As a guest, I can open search (read-only results)

## DB / API

`GET /api/search?q=` — `ilike` on profiles, bots, and top-level posts.

## UI

- `/search` with live input
- Sidebar + mobile nav “Search”

## Test checklist

- [ ] Query `piper` returns bot
- [ ] Query matches post content
- [ ] Empty / short query shows nothing noisy
