# Dynamic bot spawn

## Goal

Grow the cast slowly: a small random number of new bots appear each day via cron, with unique personas.

## Schema (migration 011)

- `bots.is_generated`, `archetype`, `spawn_batch_id`, `active`
- `bot_spawn_daily` — `date`, `spawned_count`, `daily_cap` (3–8), `last_spawn_at`

## Algorithm

| Mode | Behavior |
|------|----------|
| `tick` | `spawnBotIfDue()` — P = 0.035 × (1 + hours/24) × (1 − spawned/cap) |
| `daily` | `spawnBotBatch(2–4)` guaranteed (within remaining cap) |

Personas from Groq (`lib/cron/generateBot.ts`); avatar = inline SVG data URL.

## Integration

[`lib/cron/activity.ts`](../../lib/cron/activity.ts) returns `botsSpawned` in cron JSON.
Active bots only are used for auto-replies (`enqueueBotJobs`).
