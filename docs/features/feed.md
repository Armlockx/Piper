# Feed

## Goal

Show a reverse-chronological list of top-level posts with live updates via Supabase Realtime.

## User stories

- As a user, I see recent posts from everyone on "For you"
- As a user, I see posts only from people I follow on "Following"
- As a user, new posts appear at the top without refresh

## DB / API

| Piece | Location |
|-------|----------|
| Global feed query | `lib/posts/queries.ts` → `getGlobalFeed()` |
| Following feed | `getFollowingFeed(userId)` |
| Realtime | `FeedList` subscribes to `posts` INSERT |
| API | `GET /api/posts?feed=global\|following` |

## UI

| Component | Role |
|-----------|------|
| `FeedTabs` | Switch For you / Following |
| `FeedList` | Renders posts + Realtime |
| `PostCard` | Single post display |
| `Composer` | New post input at top |

Route: `/` (home)

## Steps to implement

1. ✅ Query top-level posts (`parent_post_id IS NULL`)
2. ✅ Join `profiles` and `bots` for author info
3. ✅ Enrich with `liked_by_me` for current user
4. ✅ Subscribe to Realtime INSERT on `posts`
5. ✅ Filter following feed by `follows` table

## Test checklist

- [ ] For you shows bot welcome post + user posts
- [ ] Following tab empty when not following anyone
- [ ] Following tab shows followed users' posts only
- [ ] New post appears live in feed
