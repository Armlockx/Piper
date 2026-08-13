# Admin Reports and Denser Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Densify `/admin/cron` and `/admin/models` into a full-width split layout, and put a 7-day cron report together with filterable `scheduled_actions` history on the cron page.

**Architecture:** No new tables. Pure date/aggregation helpers plus a `CronReportStore` that lists rows by `execute_at` range. Two admin GETs (`/api/admin/cron/report`, `/api/admin/cron/actions`). CSS stacked bars. `AdminSplit` for independent column scroll. Cron server page SSR-loads report + today’s first page; client refetches after OPS and on day/filter change.

**Tech Stack:** Next.js App Router, Vitest (`npm test -- path`), existing `requireAdminApi`, `planDateKey`, Supabase service client, Tailwind. No chart library. No React component tests.

**Spec:** `docs/superpowers/specs/2026-08-12-admin-reports-layout-design.md`

## Global Constraints

- No new database tables, migrations, or indexes.
- Day bucket = `planDateKey(execute_at)` in `PIPER_TZ` (default `America/Sao_Paulo`). Do not use Postgres `AT TIME ZONE`.
- Report window is last 7 local days inclusive of today. API rejects spans > 14 days.
- Filters apply to the history list only, not bars or selected-day totals.
- TODAY shows live queue (pending, processing, next action, planned today) — not all-time done/failed.
- After OPS, keep the selected date and reload report + that day’s list. No realtime.
- Cron UI stays English. Models stays in `Admin` (`en` + `pt`). Catalog/picker behavior unchanged.
- Vitest include is `**/*.test.ts` only — no React component tests.
- Conventional Commits; never `--no-verify`. Work on a feature branch, not `main`.
- TDD for all lib/API logic: failing test first, watch it fail, then implement.

## File map

- Create: `lib/cron/adminReport.ts` — date bounds, aggregation, parse, listReport/listActions, supabase store
- Create: `lib/cron/adminReport.test.ts` — unit tests
- Create: `app/api/admin/cron/report/route.ts` — GET report
- Create: `app/api/admin/cron/actions/route.ts` — GET day list
- Create: `components/admin/AdminSplit.tsx` — two-column admin shell
- Create: `components/admin/CronReportPanel.tsx` — bars + filters + history
- Modify: `app/(main)/admin/cron/page.tsx` — max-w, SSR initial report/actions
- Modify: `app/(main)/admin/models/page.tsx` — max-w
- Modify: `components/admin/CronSettingsForm.tsx` — AdminSplit, slim TODAY, OPS refresh
- Modify: `components/admin/ModelsSettingsForm.tsx` — providers | routes
- Existing, reuse: `lib/cron/schedulePlan.ts` `planDateKey`, `lib/auth/isAdmin.ts` `requireAdminApi`, `lib/supabase/admin.ts`

---

### Task 1: Date helpers and day aggregation

**Files:**
- Create: `lib/cron/adminReport.ts`
- Test: `lib/cron/adminReport.test.ts`

**Interfaces:**
- Consumes: `planDateKey` from `lib/cron/schedulePlan.ts`
- Produces: `ISO_DATE_RE`, `CRON_ACTION_TYPES`, `CRON_ACTION_STATUSES`, `emptyDayTotals`, `addDays`, `reportRange`, `utcBoundsForDate`, `utcBoundsForRange`, `bucketDay`, `aggregateDays`, `CronDayTotals`, `CronReportRow`

- [ ] **Step 1: Write the failing test**

Create `lib/cron/adminReport.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  addDays,
  aggregateDays,
  reportRange,
  utcBoundsForDate,
  type CronReportRow,
} from "@/lib/cron/adminReport";

const TZ = "America/Sao_Paulo";

describe("reportRange", () => {
  it("returns seven inclusive local dates ending today", () => {
    const now = new Date("2026-08-12T18:00:00.000-03:00");
    expect(reportRange(now, TZ)).toEqual({ from: "2026-08-06", to: "2026-08-12" });
  });
});

describe("utcBoundsForDate", () => {
  it("uses Sao Paulo midnight (UTC-3)", () => {
    const { start, end } = utcBoundsForDate("2026-08-12", TZ);
    expect(start.toISOString()).toBe("2026-08-12T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-13T03:00:00.000Z");
  });

  it("excludes an instant just before local midnight", () => {
    const { start } = utcBoundsForDate("2026-08-12", TZ);
    expect(new Date("2026-08-12T02:59:59.000Z") < start).toBe(true);
    expect(new Date("2026-08-12T03:00:00.000Z") >= start).toBe(true);
  });
});

describe("addDays", () => {
  it("steps calendar dates", () => {
    expect(addDays("2026-08-12", -6)).toBe("2026-08-06");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("aggregateDays", () => {
  it("fills missing days with zeros and counts statuses", () => {
    const rows: CronReportRow[] = [
      {
        id: "1",
        action_type: "bot_post",
        status: "done",
        execute_at: "2026-08-12T15:00:00.000Z",
        processed_at: null,
        error: null,
      },
      {
        id: "2",
        action_type: "organic_like",
        status: "failed",
        execute_at: "2026-08-12T16:00:00.000Z",
        processed_at: null,
        error: "x",
      },
      {
        id: "3",
        action_type: "bot_post",
        status: "pending",
        execute_at: "2026-08-11T15:00:00.000Z",
        processed_at: null,
        error: null,
      },
      {
        id: "4",
        action_type: "spawn_bot",
        status: "cancelled",
        execute_at: "2026-08-11T16:00:00.000Z",
        processed_at: null,
        error: null,
      },
      {
        id: "5",
        action_type: "bot_reply_bot",
        status: "processing",
        execute_at: "2026-08-12T17:00:00.000Z",
        processed_at: null,
        error: null,
      },
    ];
    const days = aggregateDays(rows, "2026-08-11", "2026-08-12", TZ);
    expect(days.map((d) => d.date)).toEqual(["2026-08-11", "2026-08-12"]);
    expect(days[0]).toMatchObject({ pending: 1, processing: 0, done: 0, failed: 0, cancelled: 1 });
    expect(days[1]).toMatchObject({ pending: 0, processing: 1, done: 1, failed: 1, cancelled: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/cron/adminReport.test.ts`

Expected: FAIL — cannot find module `@/lib/cron/adminReport`

- [ ] **Step 3: Write minimal implementation**

Create `lib/cron/adminReport.ts`:

```ts
import { planDateKey } from "@/lib/cron/schedulePlan";
import type { ScheduledActionStatus, ScheduledActionType } from "@/lib/types/database";

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const CRON_ACTION_TYPES = [
  "bot_post",
  "bot_reply_bot",
  "bot_reply_user",
  "organic_like",
  "user_follow",
  "bot_follow",
  "soft_unfollow",
  "spawn_bot",
] as const satisfies readonly ScheduledActionType[];

export const CRON_ACTION_STATUSES = [
  "pending",
  "processing",
  "done",
  "failed",
  "cancelled",
] as const satisfies readonly ScheduledActionStatus[];

export type CronDayTotals = {
  date: string;
  pending: number;
  processing: number;
  done: number;
  failed: number;
  cancelled: number;
};

export type CronReportRow = {
  id: string;
  action_type: string;
  status: ScheduledActionStatus;
  execute_at: string;
  processed_at: string | null;
  error: string | null;
};

export function emptyDayTotals(date: string): CronDayTotals {
  return { date, pending: 0, processing: 0, done: 0, failed: 0, cancelled: 0 };
}

export function addDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

export function reportRange(now = new Date(), timeZone = process.env.PIPER_TZ ?? "America/Sao_Paulo") {
  const to = planDateKey(now, timeZone);
  return { from: addDays(to, -6), to };
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  let hour = get("hour");
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return asUtc - date.getTime();
}

export function utcBoundsForDate(date: string, timeZone: string): { start: Date; end: Date } {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const startMs = guess - tzOffsetMs(new Date(guess), timeZone);
  const start = new Date(guess - tzOffsetMs(new Date(startMs), timeZone));
  const next = addDays(date, 1);
  const [ny, nm, nd] = next.split("-").map(Number);
  const endGuess = Date.UTC(ny, nm - 1, nd);
  const endMs = endGuess - tzOffsetMs(new Date(endGuess), timeZone);
  const end = new Date(endGuess - tzOffsetMs(new Date(endMs), timeZone));
  return { start, end };
}

export function utcBoundsForRange(from: string, to: string, timeZone: string): { start: Date; end: Date } {
  return { start: utcBoundsForDate(from, timeZone).start, end: utcBoundsForDate(to, timeZone).end };
}

export function bucketDay(iso: string, timeZone: string): string {
  return planDateKey(new Date(iso), timeZone);
}

export function aggregateDays(
  rows: CronReportRow[],
  from: string,
  to: string,
  timeZone: string
): CronDayTotals[] {
  const byDate = new Map<string, CronDayTotals>();
  for (let d = from; d <= to; d = addDays(d, 1)) {
    byDate.set(d, emptyDayTotals(d));
  }
  for (const row of rows) {
    const date = bucketDay(row.execute_at, timeZone);
    const bucket = byDate.get(date);
    if (!bucket) continue;
    if (row.status === "pending") bucket.pending += 1;
    else if (row.status === "processing") bucket.processing += 1;
    else if (row.status === "done") bucket.done += 1;
    else if (row.status === "failed") bucket.failed += 1;
    else if (row.status === "cancelled") bucket.cancelled += 1;
  }
  const days: CronDayTotals[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    days.push(byDate.get(d)!);
  }
  return days;
}
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npm test -- lib/cron/adminReport.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-12-admin-reports-layout-design.md lib/cron/adminReport.ts lib/cron/adminReport.test.ts
git commit -m "feat(cron): add helpers to bucket scheduled actions by local day"
```

Include the spec in this commit if it is still untracked.

---

### Task 2: Parse query params, list report, paginate day actions

**Files:**
- Modify: `lib/cron/adminReport.ts`
- Modify: `lib/cron/adminReport.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers and `CronReportRow`
- Produces: `CronReportStore`, `parseIsoDate`, `parseReportQuery`, `parseActionsQuery`, `encodeActionCursor`, `decodeActionCursor`, `listCronReport`, `listCronDayActions`, `CronReportResult`, `CronDayActionsResult`, `ReportQueryError`

- [ ] **Step 1: Append failing tests** to `lib/cron/adminReport.test.ts`

```ts
import {
  decodeActionCursor,
  encodeActionCursor,
  listCronDayActions,
  listCronReport,
  parseActionsQuery,
  parseReportQuery,
  type CronReportStore,
} from "@/lib/cron/adminReport";

function memoryReportStore(rows: CronReportRow[]): CronReportStore {
  return {
    async listByExecuteAtRange(startIso, endIso) {
      return rows.filter((r) => r.execute_at >= startIso && r.execute_at < endIso);
    },
  };
}

describe("parseReportQuery", () => {
  it("accepts from/to and rejects inverted or long spans", () => {
    expect(parseReportQuery({ from: "2026-08-06", to: "2026-08-12" })).toEqual({
      ok: true,
      from: "2026-08-06",
      to: "2026-08-12",
    });
    expect(parseReportQuery({ from: "2026-08-12", to: "2026-08-06" }).ok).toBe(false);
    expect(parseReportQuery({ from: "2026-08-01", to: "2026-08-16" }).ok).toBe(false);
    expect(parseReportQuery({ from: "nope", to: "2026-08-12" }).ok).toBe(false);
  });
});

describe("parseActionsQuery", () => {
  it("requires date and accepts optional filters", () => {
    expect(parseActionsQuery({ date: "2026-08-12" })).toMatchObject({
      date: "2026-08-12",
      limit: 50,
    });
    expect(parseActionsQuery({ date: "2026-08-12", status: "failed", action_type: "bot_post" })).toMatchObject({
      status: "failed",
      action_type: "bot_post",
    });
    expect(parseActionsQuery({ date: "2026-08-12", status: "nope" }).ok).toBe(false);
    expect(parseActionsQuery({}).ok).toBe(false);
  });
});

describe("listCronReport + listCronDayActions", () => {
  const rows: CronReportRow[] = [
    {
      id: "a",
      action_type: "bot_post",
      status: "done",
      execute_at: "2026-08-12T15:00:00.000Z",
      processed_at: "2026-08-12T15:01:00.000Z",
      error: null,
    },
    {
      id: "b",
      action_type: "organic_like",
      status: "failed",
      execute_at: "2026-08-12T16:00:00.000Z",
      processed_at: null,
      error: "timeout",
    },
    {
      id: "c",
      action_type: "bot_post",
      status: "done",
      execute_at: "2026-08-11T15:00:00.000Z",
      processed_at: null,
      error: null,
    },
  ];

  it("returns contiguous 7-day zeros plus counted days", async () => {
    const result = await listCronReport({
      from: "2026-08-11",
      to: "2026-08-12",
      timeZone: TZ,
      store: memoryReportStore(rows),
    });
    expect(result.days).toHaveLength(2);
    expect(result.days[1].done).toBe(1);
    expect(result.days[1].failed).toBe(1);
  });

  it("filters the list but not totals; cursor skips the previous last row", async () => {
    const store = memoryReportStore(rows);
    const all = await listCronDayActions({
      date: "2026-08-12",
      timeZone: TZ,
      store,
      limit: 50,
    });
    expect(all.totals).toEqual({
      pending: 0,
      processing: 0,
      done: 1,
      failed: 1,
      cancelled: 0,
    });
    expect(all.actions.map((a) => a.id)).toEqual(["b", "a"]);

    const failedOnly = await listCronDayActions({
      date: "2026-08-12",
      timeZone: TZ,
      store,
      status: "failed",
      limit: 50,
    });
    expect(failedOnly.totals.done).toBe(1);
    expect(failedOnly.actions.map((a) => a.id)).toEqual(["b"]);

    const page1 = await listCronDayActions({
      date: "2026-08-12",
      timeZone: TZ,
      store,
      limit: 1,
    });
    expect(page1.actions.map((a) => a.id)).toEqual(["b"]);
    expect(page1.nextCursor).toBe(encodeActionCursor(page1.actions[0]!));

    const page2 = await listCronDayActions({
      date: "2026-08-12",
      timeZone: TZ,
      store,
      limit: 1,
      cursor: page1.nextCursor ?? undefined,
    });
    expect(page2.actions.map((a) => a.id)).toEqual(["a"]);
    expect(page2.nextCursor).toBeNull();
  });
});

describe("action cursor", () => {
  it("round-trips execute_at and id", () => {
    const row = {
      execute_at: "2026-08-12T16:00:00.000Z",
      id: "b",
    };
    expect(decodeActionCursor(encodeActionCursor(row))).toEqual(row);
    expect(decodeActionCursor("nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/cron/adminReport.test.ts`

Expected: FAIL — missing exports

- [ ] **Step 3: Implement parse + list functions** in `lib/cron/adminReport.ts`

Append to `lib/cron/adminReport.ts` (merge into the existing `ScheduledActionStatus` / `ScheduledActionType` import from Task 1; do not duplicate it):

```ts
export type CronReportStore = {
  listByExecuteAtRange(startIso: string, endIso: string): Promise<CronReportRow[]>;
};

export type ReportQuery =
  | { ok: true; from: string; to: string }
  | { ok: false; error: string };

export type ActionsQuery =
  | {
      ok: true;
      date: string;
      status?: ScheduledActionStatus;
      action_type?: ScheduledActionType;
      cursor?: { execute_at: string; id: string };
      limit: number;
    }
  | { ok: false; error: string };

export function parseIsoDate(raw: string | null): string | null {
  if (!raw || !ISO_DATE_RE.test(raw)) return null;
  const [y, m, d] = raw.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return raw;
}

function daySpanInclusive(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000) + 1;
}

export function parseReportQuery(params: { from: string | null; to: string | null }): ReportQuery {
  const from = parseIsoDate(params.from);
  const to = parseIsoDate(params.to);
  if (!from || !to) return { ok: false, error: "from and to must be YYYY-MM-DD" };
  if (to < from) return { ok: false, error: "to must be >= from" };
  if (daySpanInclusive(from, to) > 14) return { ok: false, error: "range must be 14 days or less" };
  return { ok: true, from, to };
}

export function encodeActionCursor(row: { execute_at: string; id: string }): string {
  return `${row.execute_at}|${row.id}`;
}

export function decodeActionCursor(raw: string): { execute_at: string; id: string } | null {
  const i = raw.indexOf("|");
  if (i <= 0) return null;
  const execute_at = raw.slice(0, i);
  const id = raw.slice(i + 1);
  if (!execute_at || !id) return null;
  if (Number.isNaN(Date.parse(execute_at))) return null;
  return { execute_at, id };
}

export function parseActionsQuery(params: {
  date: string | null;
  status?: string | null;
  action_type?: string | null;
  cursor?: string | null;
  limit?: string | null;
}): ActionsQuery {
  const date = parseIsoDate(params.date);
  if (!date) return { ok: false, error: "date must be YYYY-MM-DD" };

  let status: ScheduledActionStatus | undefined;
  if (params.status) {
    if (!(CRON_ACTION_STATUSES as readonly string[]).includes(params.status)) {
      return { ok: false, error: "invalid status" };
    }
    status = params.status as ScheduledActionStatus;
  }

  let action_type: ScheduledActionType | undefined;
  if (params.action_type) {
    if (!(CRON_ACTION_TYPES as readonly string[]).includes(params.action_type)) {
      return { ok: false, error: "invalid action_type" };
    }
    action_type = params.action_type as ScheduledActionType;
  }

  let cursor: { execute_at: string; id: string } | undefined;
  if (params.cursor) {
    const decoded = decodeActionCursor(params.cursor);
    if (!decoded) return { ok: false, error: "invalid cursor" };
    cursor = decoded;
  }

  let limit = 50;
  if (params.limit != null && params.limit !== "") {
    const n = Number(params.limit);
    if (!Number.isInteger(n) || n < 1 || n > 100) return { ok: false, error: "limit must be 1-100" };
    limit = n;
  }

  return { ok: true, date, status, action_type, cursor, limit };
}

function cmpActionDesc(a: CronReportRow, b: CronReportRow): number {
  if (a.execute_at !== b.execute_at) return a.execute_at < b.execute_at ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

function afterCursor(row: CronReportRow, cursor: { execute_at: string; id: string }): boolean {
  if (row.execute_at < cursor.execute_at) return true;
  if (row.execute_at > cursor.execute_at) return false;
  return row.id < cursor.id;
}

export async function listCronReport(input: {
  from: string;
  to: string;
  timeZone: string;
  store: CronReportStore;
}) {
  const { start, end } = utcBoundsForRange(input.from, input.to, input.timeZone);
  const rows = await input.store.listByExecuteAtRange(start.toISOString(), end.toISOString());
  return {
    timezone: input.timeZone,
    from: input.from,
    to: input.to,
    days: aggregateDays(rows, input.from, input.to, input.timeZone),
  };
}

export async function listCronDayActions(input: {
  date: string;
  timeZone: string;
  store: CronReportStore;
  status?: ScheduledActionStatus;
  action_type?: ScheduledActionType;
  cursor?: { execute_at: string; id: string };
  limit: number;
}) {
  const { start, end } = utcBoundsForDate(input.date, input.timeZone);
  const rows = await input.store.listByExecuteAtRange(start.toISOString(), end.toISOString());
  const totals = aggregateDays(rows, input.date, input.date, input.timeZone)[0] ?? emptyDayTotals(input.date);

  let list = rows.slice().sort(cmpActionDesc);
  if (input.status) list = list.filter((r) => r.status === input.status);
  if (input.action_type) list = list.filter((r) => r.action_type === input.action_type);
  if (input.cursor) list = list.filter((r) => afterCursor(r, input.cursor!));

  const page = list.slice(0, input.limit);
  const nextCursor = page.length === input.limit && list.length > input.limit
    ? encodeActionCursor(page[page.length - 1]!)
    : null;

  return {
    date: input.date,
    totals: {
      pending: totals.pending,
      processing: totals.processing,
      done: totals.done,
      failed: totals.failed,
      cancelled: totals.cancelled,
    },
    actions: page.map((r) => ({
      id: r.id,
      action_type: r.action_type,
      status: r.status,
      execute_at: r.execute_at,
      processed_at: r.processed_at,
      error: r.error,
    })),
    nextCursor,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- lib/cron/adminReport.test.ts`

Expected: PASS. If the cursor page test fails because `nextCursor` is null when `list.length === limit`, keep the condition `page.length === input.limit && list.length > input.limit` (page of 1 with 2 matching rows yields a cursor).

- [ ] **Step 5: Commit**

```bash
git add lib/cron/adminReport.ts lib/cron/adminReport.test.ts
git commit -m "feat(cron): list 7-day totals and paginated day actions"
```

---

### Task 3: Supabase store and admin GET routes

**Files:**
- Modify: `lib/cron/adminReport.ts` — add `createSupabaseCronReportStore`
- Create: `app/api/admin/cron/report/route.ts`
- Create: `app/api/admin/cron/actions/route.ts`

**Interfaces:**
- Consumes: `listCronReport`, `listCronDayActions`, `parseReportQuery`, `parseActionsQuery`, `requireAdminApi`
- Produces: `GET /api/admin/cron/report?from&to` → `{ timezone, from, to, days }`; `GET /api/admin/cron/actions?date&status&action_type&cursor&limit` → `{ date, totals, actions, nextCursor }`

- [ ] **Step 1: Add `createSupabaseCronReportStore`** to `lib/cron/adminReport.ts`

```ts
import { createAdminClient } from "@/lib/supabase/admin";

export function createSupabaseCronReportStore(): CronReportStore {
  const admin = createAdminClient();
  return {
    async listByExecuteAtRange(startIso, endIso) {
      const { data, error } = await admin
        .from("scheduled_actions")
        .select("id, action_type, status, execute_at, processed_at, error")
        .gte("execute_at", startIso)
        .lt("execute_at", endIso);
      if (error) throw new Error(error.message);
      return (data ?? []) as CronReportRow[];
    },
  };
}

export function cronReportTimeZone(): string {
  return process.env.PIPER_TZ ?? "America/Sao_Paulo";
}
```

Do not select `payload`.

- [ ] **Step 2: Create** `app/api/admin/cron/report/route.ts`

Follow `app/api/admin/models/catalog/route.ts` auth. Named `GET` export.

```ts
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/isAdmin";
import {
  createSupabaseCronReportStore,
  cronReportTimeZone,
  listCronReport,
  parseReportQuery,
} from "@/lib/cron/adminReport";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const q = new URL(request.url).searchParams;
  const parsed = parseReportQuery({ from: q.get("from"), to: q.get("to") });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await listCronReport({
      from: parsed.from,
      to: parsed.to,
      timeZone: cronReportTimeZone(),
      store: createSupabaseCronReportStore(),
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create** `app/api/admin/cron/actions/route.ts`

```ts
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/isAdmin";
import {
  createSupabaseCronReportStore,
  cronReportTimeZone,
  listCronDayActions,
  parseActionsQuery,
} from "@/lib/cron/adminReport";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const q = new URL(request.url).searchParams;
  const parsed = parseActionsQuery({
    date: q.get("date"),
    status: q.get("status"),
    action_type: q.get("action_type"),
    cursor: q.get("cursor"),
    limit: q.get("limit"),
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await listCronDayActions({
      date: parsed.date,
      timeZone: cronReportTimeZone(),
      store: createSupabaseCronReportStore(),
      status: parsed.status,
      action_type: parsed.action_type,
      cursor: parsed.cursor,
      limit: parsed.limit,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load actions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Re-run helper tests**

Run: `npm test -- lib/cron/adminReport.test.ts`

Expected: PASS

Manual: unauthenticated `GET /api/admin/cron/report?from=2026-08-06&to=2026-08-12` → 401.

- [ ] **Step 5: Commit**

```bash
git add lib/cron/adminReport.ts app/api/admin/cron/report/route.ts app/api/admin/cron/actions/route.ts
git commit -m "feat(api): add admin endpoints for cron report and history"
```

---

### Task 4: Split shell, cron report panel, slim TODAY

**Files:**
- Create: `components/admin/AdminSplit.tsx`
- Create: `components/admin/CronReportPanel.tsx`
- Modify: `app/(main)/admin/cron/page.tsx`
- Modify: `components/admin/CronSettingsForm.tsx`

**Interfaces:**
- Consumes: `listCronReport` / `listCronDayActions` results as props; `GET /api/admin/cron/report` and `GET /api/admin/cron/actions`; existing OPS POST
- Produces: `AdminSplit({ leftSpan: 5 | 6, left, right })`; `CronReportPanel` with initial report + day actions; CronSettingsForm calls `onOpsComplete` after a successful OPS action

- [ ] **Step 1: Create** `components/admin/AdminSplit.tsx`

```tsx
export function AdminSplit({
  leftSpan,
  left,
  right,
}: {
  leftSpan: 5 | 6;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  const leftClass = leftSpan === 5 ? "lg:col-span-5" : "lg:col-span-6";
  const rightClass = leftSpan === 5 ? "lg:col-span-7" : "lg:col-span-6";
  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
      <div className={`${leftClass} min-h-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto`}>
        {left}
      </div>
      <div className={`${rightClass} min-h-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto`}>
        {right}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create** `components/admin/CronReportPanel.tsx`

Client component. Props:

```ts
export type CronReportDay = {
  date: string;
  pending: number;
  processing: number;
  done: number;
  failed: number;
  cancelled: number;
};

export type CronHistoryRow = {
  id: string;
  action_type: string;
  status: string;
  execute_at: string;
  processed_at: string | null;
  error: string | null;
};

export type CronDayActionsPayload = {
  date: string;
  totals: Omit<CronReportDay, "date">;
  actions: CronHistoryRow[];
  nextCursor: string | null;
};

export function CronReportPanel({
  timezone,
  initialFrom,
  initialTo,
  initialDays,
  initialActions,
  reloadToken,
}: {
  timezone: string;
  initialFrom: string;
  initialTo: string;
  initialDays: CronReportDay[];
  initialActions: CronDayActionsPayload;
  reloadToken: number;
})
```

Behavior:

1. State: `days`, `selectedDate` (default `initialTo`), `totals`, `actions`, `nextCursor`, `statusFilter` (`""` = all), `typeFilter` (`""` = all), `error`, `loading`.
2. On mount and whenever `reloadToken` changes: `GET /api/admin/cron/report?from=${initialFrom}&to=${initialTo}`, replace `days`. Then load the selected day’s list (reset cursor).
3. Clicking a bar sets `selectedDate` and reloads that day’s list from page 1.
4. Changing a filter reloads the list from page 1; do not refetch the report.
5. Load more: `GET .../actions?date=&status=&action_type=&cursor=` and append.
6. Bars: seven columns. Height scale = max of `(done + failed + pending + processing)` across days (use 1 if max is 0). Segments: done `bg-neon-cyan`, failed `bg-red-400`, pending+processing `bg-white/20`. Column `min-h-[2px]`. Selected day `outline outline-1 outline-neon-magenta`.
7. Totals line under the chart uses `totals` from the actions payload (unfiltered).
8. List: `font-mono text-xs`. Format `execute_at` with `Intl.DateTimeFormat` `timeZone: timezone`, `hour`+`minute` (2-digit). Truncate `error` to 80 chars. Failed status `text-red-400`.
9. Selects: All + `CRON_ACTION_STATUSES`; All + `CRON_ACTION_TYPES` (import from `lib/cron/adminReport`).
10. Errors stay in this pane (`text-red-400`). Empty: `No actions this day.`

Load helper (inside the file):

```ts
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  return data as T;
}
```

Do not import a chart library.

- [ ] **Step 3: Slim TODAY and wrap the cron form**

In `components/admin/CronSettingsForm.tsx`:

- Add props `initialReport` (`{ from, to, days, timezone }`) and `initialActions` (`CronDayActionsPayload`).
- Add `const [reloadToken, setReloadToken] = useState(0)`.
- After a successful `runAction` (existing `setStatus(data.status)`), also `setReloadToken((n) => n + 1)`.
- In the TODAY `<dl>`, **delete** the Done and Failed `<div>`s. Keep Date, Queued today, Pending, Next action. Add Processing from `status.processing` (the type already has it).
- Wrap the returned tree with `AdminSplit leftSpan={5}`. Left: TODAY, OPS, CRON MASTER, DAILY INTERACTIONS (change the quota map from stacked cards to a table: `grid-cols-[1fr_5rem_5rem]` rows as now, but drop extra vertical padding so it reads as a dense table), message/error, Save. Right: `<CronReportPanel ... reloadToken={reloadToken} />`.
- Change the page container in `app/(main)/admin/cron/page.tsx` from `max-w-2xl` to `max-w-[1400px]`.

Quota row markup (replace the current `space-y-4` map):

```tsx
<div className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-x-2 gap-y-2 sm:items-center">
  <p className="font-mono text-[10px] text-white/40">Action</p>
  <p className="font-mono text-[10px] text-white/40">Min</p>
  <p className="font-mono text-[10px] text-white/40">Max</p>
  {QUOTA_ROWS.map(({ key, label, hint }) => {
    const minKey = `${key}_min` as keyof FormState;
    const maxKey = `${key}_max` as keyof FormState;
    return (
      <div key={key} className="contents">
        <div>
          <p className="font-mono text-xs text-white/80">{label}</p>
          <p className="font-mono text-[10px] text-white/40">{hint}</p>
        </div>
        <Input type="number" min={0} value={form[minKey] as number} onChange={(e) => setQuotaMinMax(key, "min", e.target.value)} />
        <Input type="number" min={0} value={form[maxKey] as number} onChange={(e) => setQuotaMinMax(key, "max", e.target.value)} />
      </div>
    );
  })}
</div>
```

- [ ] **Step 4: SSR initial data** in `app/(main)/admin/cron/page.tsx`

```tsx
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CronSettingsForm } from "@/components/admin/CronSettingsForm";
import { getAdminSession } from "@/lib/auth/isAdmin";
import { getCronAdminStatus } from "@/lib/cron/adminStatus";
import { getCronSettings } from "@/lib/cron/config";
import {
  createSupabaseCronReportStore,
  cronReportTimeZone,
  listCronDayActions,
  listCronReport,
  reportRange,
} from "@/lib/cron/adminReport";

export default async function AdminCronPage() {
  const session = await getAdminSession();
  if (!session.user) redirect("/login");
  if (!session.isAdmin) redirect("/");

  const t = await getTranslations("Admin");
  const timeZone = cronReportTimeZone();
  const { from, to } = reportRange(new Date(), timeZone);
  const store = createSupabaseCronReportStore();
  const [settings, status, report, todayActions] = await Promise.all([
    getCronSettings(true),
    getCronAdminStatus(),
    listCronReport({ from, to, timeZone, store }),
    listCronDayActions({ date: to, timeZone, store, limit: 50 }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-24">
      <h1 className="mb-2 font-pixel text-xs text-neon-cyan tracking-widest">{t("cronTitle")}</h1>
      <p className="mb-6 font-mono text-xs text-white/45">{t("cronBody")}</p>
      <CronSettingsForm
        key={`${settings.updated_at}-${status.date}`}
        initialSettings={settings}
        initialStatus={status}
        initialReport={report}
        initialActions={todayActions}
      />
    </div>
  );
}
```

Pass `initialReport` / `initialActions` through to `CronReportPanel`.

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminSplit.tsx components/admin/CronReportPanel.tsx components/admin/CronSettingsForm.tsx "app/(main)/admin/cron/page.tsx"
git commit -m "feat(cron): show 7-day report and action history in a split layout"
```

On Windows PowerShell the path may be `app/(main)/admin/cron/page.tsx` — quote it.

---

### Task 5: Models providers | routes split

**Files:**
- Modify: `app/(main)/admin/models/page.tsx`
- Modify: `components/admin/ModelsSettingsForm.tsx`

**Interfaces:**
- Consumes: `AdminSplit` from Task 4
- Produces: models page `max-w-[1400px]`; left providers+catalog, right compact routes + Save

- [ ] **Step 1: Widen the models page**

In `app/(main)/admin/models/page.tsx` replace `max-w-2xl` with `w-full max-w-[1400px]` (keep `mx-auto px-4 py-6 pb-24`).

- [ ] **Step 2: Split the form**

In `components/admin/ModelsSettingsForm.tsx` replace the outer `<div className="flex flex-col gap-8">` with `AdminSplit leftSpan={6}`.

Left: the existing providers `<section>` (catalog remains visible after load).

Right: the routes `<section>`. Compact each route card: keep job label, provider `<select>`, `ModelPicker`; put max tokens and temperature on one `grid-cols-2` row (already there). Move `{message}`, `{error}`, and the Save button to the bottom of the **right** column.

Do not change catalog fetch, picker, or PATCH payload.

- [ ] **Step 3: Commit**

```bash
git add "app/(main)/admin/models/page.tsx" components/admin/ModelsSettingsForm.tsx
git commit -m "feat(ui): put admin model providers and routes side by side"
```

---

### Task 6: Verification

- [ ] **Step 1: Run the unit suite**

Run: `npm test -- lib/cron/adminReport.test.ts lib/cron/adminActions.test.ts`

Expected: PASS

- [ ] **Step 2: Manual checks** (from the spec)

- Wide viewport: cron is two independently scrolling columns; models is providers | routes.
- TODAY has no all-time done/failed.
- Click a day with failures: list shows them; bars stay 7 days.
- Status/type filters change the list, not the totals line.
- Run due: right pane reloads without changing the selected day.
- Models: load catalog, pick a grouped model, save.

- [ ] **Step 3: Do not commit** unless verification found a fix; if you fix a bug, commit `fix(cron): …` separately.
