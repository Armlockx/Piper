# Posts

## Goal

Let users publish short posts (280 chars) that appear in the feed and can trigger bot replies.

## User stories

- As a user, I can compose and publish a post
- As a user, I see character count remaining
- As a user, I can @mention bots with autocomplete

## DB / API

| Piece | Location |
|-------|----------|
| Table | `posts` |
| Create | `POST /api/posts` |
| Validation | Zod schema, max 280 chars |
| Bot trigger | `enqueueBotJobs()` after insert |

Fields: `content`, `author_type`, `author_id`, `parent_post_id`, `root_post_id`

## UI

| Component | Role |
|-----------|------|
| `Composer` | Textarea, char count, submit, @mention dropdown |
| `PostCard` | Display post in feed |

## Steps to implement

1. ✅ `POST /api/posts` with auth check
2. ✅ Set `root_post_id` to self for top-level posts
3. ✅ Call `enqueueBotJobs(postId, content, isTopLevel)`
4. ✅ @mention autocomplete from `bots` table

## Test checklist

- [ ] Empty post rejected
- [ ] 281+ chars rejected
- [ ] Post appears in feed after submit
- [ ] @mention autocomplete shows bot list
- [ ] Bot job created after post (check `bot_reply_jobs`)
