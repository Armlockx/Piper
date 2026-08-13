# Admin model catalog and cron ops

Date: 2026-08-12

## Intent

Admins currently type LLM `model_id` by hand and cannot inspect what a provider actually offers. The cron page can change quotas but cannot clear the queue, retry failures, or run work on demand. This spec adds a live per-provider model catalog on `/admin/models` and operational actions on `/admin/cron`.

This supersedes the earlier lock “No live OpenRouter model catalog. Model IDs are text fields.” in `2026-08-12-voice-i18n-openrouter-design.md`. Routes still accept a custom id; the catalog is an aid, not a whitelist.

## Locked decisions

- Approach A: live fetch, no new tables. Catalog lives in client session state keyed by `providerId`.
- Provider card shows the catalog **visible** after load: grouped list + search + Refresh.
- Each route replaces the plain `model_id` input with a searchable grouped picker fed by the same catalog. A value that is not in the catalog remains valid (custom id).
- Clicking a row in the provider catalog is browse-only. Assignment happens only in the route picker.
- Cron actions live in a new **OPS** section under TODAY, grouped as RUN / PLAN / QUEUE. Destructive buttons are red and require `confirm()`.
- No merged “ops dashboard”. Models and cron stay on their current pages.
- No persisted model cache. No component tests for the picker in this round.

## Architecture

### Model catalog

`GET /api/admin/models/catalog?providerId=<uuid>` (admin only).

1. Load `llm_providers` row by id. Disabled providers still catalog (admin browse, not a completion).
2. Resolve API key the same way `resolveLlmEndpoint` does: decrypt stored key, else env fallback (`OPENROUTER_API_KEY` / `GROQ_API_KEY` by slug).
3. `GET {base_url}/models` with `Authorization: Bearer`.
4. Map OpenAI-shaped `{ data: [{ id, name?, owned_by? }] }` to `{ id, name, family }[]`.
5. Return `{ providerId, models }`. Nothing is written to the database.

Family rules (pure function `familyForModel(id, ownedBy, providerSlug)`):

- If `id` contains `/`, family is the lowercase prefix (`anthropic/claude-sonnet-4` → `anthropic`).
- Else if `owned_by` is present and non-empty, use it lowercased.
- Else use the provider `slug`.

`name` is `name` from the provider when present, otherwise `id`.

### Cron actions

Existing `PATCH /api/admin/cron` stays settings-only.

`POST /api/admin/cron` with `{ action }` (admin only). Every successful response includes the same `{ settings, status }` shape as GET, plus action-specific fields.

| `action` | Effect |
|---|---|
| `clear_pending` | Delete `scheduled_actions` where `status = pending` |
| `clear_all` | Delete all rows in `scheduled_actions` |
| `reset_plan` | Delete today’s `cron_plan_daily` row (`PIPER_TZ` date key, same helper as `planDay`) |
| `retry_failed` | Set `status = pending`, clear `error` / `processed_at` on rows with `status = failed` |
| `replan` | Call existing `planDay()`. If today’s plan already exists, return `already_planned: true` (not an error) |
| `run_due` | One tick: `processDueActions(settings.tick_batch_size)`. Only due rows. Click again for another batch. |
| `run_all_pending` | Set `execute_at = now()` on all `pending` rows, then loop `processDueActions` in batches until none remain or ~4 minutes elapsed |

`run_all_pending` time budget: stop before Vercel’s 300s `maxDuration`. If the budget hits, return `{ timedOut: true, remaining }` and leave leftover rows `pending` with `execute_at` already set to now so a second click continues. Do not mark leftovers `failed`.

Route `maxDuration` for this POST: 300.

## UI

### `/admin/models`

Keep current provider fields (name, base url, enabled, api key). After them, on each provider card:

- `Load models` when that provider has no session catalog; `Refresh` once loaded.
- Search input filters by `id` and `name` (case-insensitive).
- Scrollable list grouped by `family` (heading per group, models under it).
- Empty / error copy on the card; other providers unaffected.

On each route:

- Provider `<select>` unchanged.
- `model_id` becomes a small custom combobox (no new UI package): search, groups by family, current value always shown even if missing from the catalog. Changing provider switches which catalog the combobox uses and triggers a load if that catalog is not in session yet.

Strings for this page go in the existing `Admin` next-intl namespace (`en` + `pt`).

### `/admin/cron`

New **OPS** card below TODAY, above CRON MASTER:

- **RUN:** Run due · Run all pending
- **PLAN:** Retry failed · Reset plan · Replan today
- **QUEUE:** Clear pending · Clear all (both red)

`clear_pending`, `clear_all`, and `reset_plan` require `window.confirm` with a one-line consequence. Reset plan stays in PLAN colors; only QUEUE is red. `run_all_pending` confirms that it ignores scheduled times and may take minutes / spend LLM. After any action, replace the TODAY counters from the response. Disable buttons while a request is in flight. If `timedOut`, show remaining count so the admin can click again.

This form stays English, matching the rest of `CronSettingsForm`.

## Error handling

| Case | Behavior |
|---|---|
| Catalog, no API key (stored or env) | 400, message on that provider card |
| Catalog, provider HTTP not OK | 502, snippet of body (≤200 chars) |
| Catalog, JSON not `{ data: [] }` | 502, “unexpected models payload” |
| Catalog, empty `data` | 200 with `models: []`, empty-state on card; route picker still accepts typed ids |
| Cron POST, unknown action | 400 |
| Cron POST, not admin | existing `requireAdminApi` 401/403 |
| `replan` while plan exists | 200 + `already_planned: true` |
| `run_all_pending` budget | 200 + `timedOut: true`, `remaining` |
| Single scheduled action throws | existing `processDueActions` marks that row `failed`; the loop continues |

Settings are never mutated by POST actions.

## Testing

- `familyForModel`: slash prefix, `owned_by`, slug fallback; grouping a mixed list yields the right headings.
- Catalog GET (handler or wrapper with mocked fetch + supabase): missing key → 400; OpenAI-shaped payload → models with families; provider 500 → 502.
- Cron action helpers with mocked supabase: `clear_pending` does not delete `done`; `clear_all` empties; `retry_failed` only touches `failed`; `reset_plan` deletes today’s plan row only; `run_all_pending` over budget returns `timedOut` + `remaining` without failing leftovers.
- POST without admin session → 401/403.

No React component tests in this round. Manual: load OpenRouter catalog, pick a grouped model on a route, save; run each OPS action once on a non-prod queue.

## Out of scope

- Persisting catalogs (`llm_provider_models` or similar)
- Merging admin models + cron into one page
- New claim RPC; `run_all_pending` reuses `processDueActions` after bumping `execute_at`
- i18n for the cron form
- Streaming, new providers, or changing how completions are called
