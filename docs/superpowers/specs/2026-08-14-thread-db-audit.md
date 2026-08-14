# Thread DB audit (2026-08-14)

Live `execute_sql` against the ReceptioBotist Supabase project timed out on every attempt
(`Connection terminated due to connection timeout`), including a single `SELECT count(*) FROM posts`.
Findings below are from migrations + application code. Hygiene SQL is bundled in
`017_thread_provenance.sql` so leftover nulls get repaired when the migration is applied.

## Queries that should be re-run after connectivity is back

```sql
-- A) Integridade da árvore
SELECT 'missing_root' AS issue, count(*) FROM posts
WHERE parent_post_id IS NOT NULL AND root_post_id IS NULL
UNION ALL
SELECT 'root_mismatch', count(*) FROM posts p
JOIN posts parent ON p.parent_post_id = parent.id
WHERE p.root_post_id IS DISTINCT FROM COALESCE(parent.root_post_id, parent.id);

-- B) Jobs recentes (30 dias)
SELECT status, trigger, count(*), max(created_at)
FROM bot_reply_jobs WHERE created_at > now() - interval '30 days'
GROUP BY 1, 2;

-- C) Falhas recentes com erro
SELECT trigger, error, count(*) FROM bot_reply_jobs
WHERE status = 'failed' AND created_at > now() - interval '14 days'
GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 20;

-- D) Jobs still missing root_post_id (should be 0 after 009 + 017)
SELECT count(*) FROM bot_reply_jobs WHERE root_post_id IS NULL;

-- E) Cron-only bot replies (no matching job on parent)
SELECT p.root_post_id, count(*) AS bot_posts
FROM posts p
WHERE p.author_type = 'bot' AND p.parent_post_id IS NOT NULL
  AND p.created_at > now() - interval '14 days'
  AND NOT EXISTS (
    SELECT 1 FROM bot_reply_jobs j WHERE j.post_id = p.parent_post_id
  )
GROUP BY 1 ORDER BY 2 DESC LIMIT 20;
```

## Schema-level findings

### Two bot-reply pipelines

User-triggered replies go through `bot_reply_jobs` (`lib/bots/processReply.ts`) and therefore
drive `BotTyping` via realtime on `root_post_id`. Cron organic replies
(`lib/cron/replies.ts`) insert `posts` directly, skip the queue, and never show typing.

### Tree stored, UI flat

`posts.parent_post_id` / `root_post_id` already model a thread tree. `getThread()` returns a
chronological list; `ThreadView` renders it flat.

### Reply counters

`sync_post_reply_count` increments both the immediate parent and the root when they differ.
Root `reply_count` ≈ thread size; intermediate `reply_count` ≈ direct children. The card
does not distinguish these.

### Migration 009 leftover

`009_realtime_fixes.sql` backfilled `bot_reply_jobs.root_post_id` and new user-triggered jobs
always set it. `useThreadRealtime` still subscribes to unfiltered job INSERTs for pre-009
rows. `017` re-runs that backfill plus a posts tree repair; the unfiltered fallback can then
be removed.

### No provenance on posts

`bot_reply_jobs.trigger` is `auto` | `mention` only. Cron replies have no corresponding job,
so the feed cannot tell mention vs auto vs cron.

### Silent failures

`bot_reply_jobs.error` is stored but never shown. A failed @mention looks like silence.

## Decision

- Include tree + job `root_post_id` hygiene in migration 017.
- Add `posts.reply_source` and `bot_reply_jobs.trigger = 'cron'`.
- Route cron replies through `processBotReplyJob`.
- Drop the unfiltered realtime fallback after 017 hygiene.
