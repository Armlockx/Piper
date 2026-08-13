# Admin reports, history, and denser layout

Date: 2026-08-12

## Intent

Admin cron and models pages are feed-width (`max-w-2xl`) stacks. Cron shows all-time pending/done/failed counts and has no action list. This spec densifies both pages into a full-width split layout, and puts a 7-day cron report together with a filterable `scheduled_actions` history on `/admin/cron`.

## Locked decisions

- Approach A: no new tables. Two GETs (`report` + `actions`). CSS bars, no chart library.
- `/admin/cron` and `/admin/models` stay separate pages. Both leave `max-w-2xl` and use `AdminSplit`.
- Cron split: left ops + configs; right 7-day report + history. Independent scroll on `lg+`.
- Last 7 local days (`PIPER_TZ`, inclusive of today). Click a day to filter the list and show that day’s totals. Default day = today.
- Filters (status, action type) apply to the **list only**, not the bars or the selected-day totals.
- Day bucket = `planDateKey(execute_at)` (same helper as the daily planner).
- TODAY is a live **queue** snapshot (pending, processing, next action, planned today). It does not show all-time done/failed.
- After any OPS action, reload report + current day’s list. No realtime/polling.
- Models: left providers + visible catalog; right compact route cards. Existing catalog/picker behavior unchanged.
- Cron UI stays English. Models stays in the `Admin` next-intl namespace.
- No new DB index this round. No payload inspector. No platform/LLM metrics.

## Architecture

```text
/admin/cron  (AdminSplit 5/7)
  left:  TODAY queue + OPS + CRON MASTER + quota table + Save
  right: 7-day bars + selected-day totals + filters + history + Load more

/admin/models (AdminSplit 6/6)
  left:  provider cards + catalog
  right: 7 route cards + Save

GET /api/admin/cron/report?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/admin/cron/actions?date=YYYY-MM-DD&status=&action_type=&cursor=&limit=
```

Existing `GET/PATCH/POST /api/admin/cron` stay as they are. `getCronAdminStatus()` may still return all-time `done`/`failed`; the TODAY card simply does not render those two fields.

### Date window

`from` = today − 6 days, `to` = today, both via `planDateKey` in `PIPER_TZ` (default `America/Sao_Paulo`).

Helpers in `lib/cron/adminReport.ts` (pure, unit-tested):

- `reportRange(now, timeZone)` → `{ from, to }` (`YYYY-MM-DD`)
- `utcBoundsForDate(date, timeZone)` → `[start, end)` instants so a SQL/filter range covers that local day
- `utcBoundsForRange(from, to, timeZone)` → `[start, end)` covering `from` 00:00 through `to` 24:00 local
- `bucketDay(iso, timeZone)` → `planDateKey(new Date(iso), timeZone)`
- `aggregateDays(actions, from, to, timeZone)` → exactly `(to - from + 1)` day rows, zeros included

Query layer fetches `id, action_type, status, execute_at` in the UTC window, then aggregates in JS. Do not use Postgres `AT TIME ZONE` for bucketing (harder to test; must match `planDateKey`).

The cron server page loads report + today’s first actions page and passes them as props so the right pane is filled on first paint. The client refetches after OPS and on day/filter/load-more.

### `GET /api/admin/cron/report`

Admin only (`requireAdminApi`). Query: `from`, `to` required, `YYYY-MM-DD`. Reject if missing/invalid, if `to < from`, or if the span is > 14 days.

Response:

```ts
{
  timezone: string
  from: string
  to: string
  days: Array<{
    date: string
    pending: number
    processing: number
    done: number
    failed: number
    cancelled: number
  }>
}
```

`days` is contiguous. The UI always requests the last 7 days.

### `GET /api/admin/cron/actions`

Admin only. Query:

| param | rules |
|---|---|
| `date` | required `YYYY-MM-DD` |
| `status` | optional; one of `pending`, `processing`, `done`, `failed`, `cancelled` |
| `action_type` | optional; one of the eight `scheduled_actions.action_type` values |
| `cursor` | optional; see pagination |
| `limit` | optional int 1–100, default 50 |

Response:

```ts
{
  date: string
  totals: {
    pending: number
    processing: number
    done: number
    failed: number
    cancelled: number
  }
  actions: Array<{
    id: string
    action_type: string
    status: string
    execute_at: string
    processed_at: string | null
    error: string | null
  }>
  nextCursor: string | null
}
```

`totals` is **unfiltered** (all rows whose `execute_at` falls on `date`). `actions` is filtered by `status` / `action_type` when set.

Do not select `payload`.

Pagination: order `execute_at desc`, `id desc`. Cursor is `"{execute_at ISO}|{id}"`. Next page: rows strictly after that pair. `nextCursor` is null when the page is short.

Invalid `date` / `status` / `action_type` / `cursor` → 400. Empty day → 200 with zero totals and `actions: []`.

## UI

Shared wrapper `components/admin/AdminSplit.tsx`:

- Page container: `mx-auto w-full max-w-[1400px] px-4 py-6 pb-24` (replaces `max-w-2xl` on both admin pages).
- Grid: `lg:grid-cols-12 gap-4`. Left `lg:col-span-5` (cron) or `6` (models); right the rest.
- On `lg+`, each column `max-h-[calc(100vh-8rem)] overflow-y-auto`. Below `lg`, natural document scroll, left then right.

### `/admin/cron` left

1. **TODAY** — date, timezone, planned today, pending, processing, next action. No all-time done/failed.
2. **OPS** — existing RUN / PLAN / QUEUE buttons and confirms. After success, refresh report + selected day’s list (keep the selected date).
3. **CRON MASTER** — enabled + the existing timing fields in a 2-column grid.
4. **DAILY INTERACTIONS** — dense table: label (+ hint) \| min \| max. One row per quota type.
5. Save cron settings at the bottom of this column.

### `/admin/cron` right (`CronReportPanel`)

1. Seven CSS bars (one per day). Stacked segments: done = cyan, failed = red, pending+processing = dim. `cancelled` is in `totals` only, not a bar segment. Click selects the day (outline). Selected defaults to today. Days with zero actions stay clickable (min bar height 2px so the column remains a target).
2. Selected-day totals line (pending / done / failed from `actions.totals`; matches that row in `days`).
3. Filters: status `<select>` (All + five statuses), type `<select>` (All + eight types). Changing a filter reloads the list from page 1; does not change bars or totals.
4. List, monospace: local time (`PIPER_TZ`) · status · `action_type` · error truncated to 80 chars. Failed rows use red status.
5. Empty copy when the day has no rows (or no rows matching filters).
6. **Load more** when `nextCursor` is set; appends.
7. Query/load error on this column only; left column stays usable.

No payload expand. No per-type breakdown chart.

### `/admin/models`

Left: existing provider cards including visible grouped catalog + search + Load/Refresh.

Right: the seven route cards, compacted: job label, provider select, `ModelPicker`, max tokens + temperature on one row. Save at the bottom of the right column.

Catalog load-on-provider-change and custom model ids stay as in `2026-08-12-admin-models-cron-ops-design.md`.

## Error handling

| Case | Behavior |
|---|---|
| Report/actions, not admin | existing `requireAdminApi` 401 |
| Invalid `from`/`to`/`date`/`status`/`action_type`/`cursor` | 400 |
| `to < from` or span > 14 days | 400 |
| Day with no rows | 200, zeros + empty list |
| Supabase query error | 500; right pane shows the message |
| OPS / save failure | existing left-pane error; do not clear the right pane |

## Testing

Pure functions + route wrappers. No React component tests this round.

- `reportRange`: frozen now in `America/Sao_Paulo` yields seven inclusive dates ending today.
- `utcBoundsForDate`: an `execute_at` just inside/outside a Sao Paulo midnight is in/out.
- `aggregateDays`: mixed statuses across two days; missing days are zero; cancelled counted; pending+processing both counted.
- Actions filter: date window; `status=failed` excludes done; `action_type=bot_post` excludes likes; cursor skips the previous page’s last row.
- GET without admin session → 401.

Manual: wide viewport shows two scrolling columns; click a red day and see its failures; Run due then the right pane updates; models providers \| routes side by side.

## Out of scope

- Platform analytics (users, posts, bots)
- LLM usage / cost
- Merging cron + models into one page
- Persisted daily rollups or a new index
- Chart library, realtime, payload inspector
- i18n for the cron form
- Changing how completions or ticks run
