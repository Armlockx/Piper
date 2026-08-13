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

export function parseIsoDate(raw: string | null | undefined): string | null {
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
  date?: string | null;
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
  cursor?: string | { execute_at: string; id: string };
  limit: number;
}) {
  const { start, end } = utcBoundsForDate(input.date, input.timeZone);
  const rows = await input.store.listByExecuteAtRange(start.toISOString(), end.toISOString());
  const totals = aggregateDays(rows, input.date, input.date, input.timeZone)[0] ?? emptyDayTotals(input.date);

  const cursor =
    typeof input.cursor === "string" ? decodeActionCursor(input.cursor) : input.cursor;

  let list = rows.slice().sort(cmpActionDesc);
  if (input.status) list = list.filter((r) => r.status === input.status);
  if (input.action_type) list = list.filter((r) => r.action_type === input.action_type);
  if (cursor) list = list.filter((r) => afterCursor(r, cursor));

  const page = list.slice(0, input.limit);
  const nextCursor =
    page.length === input.limit && list.length > input.limit
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
