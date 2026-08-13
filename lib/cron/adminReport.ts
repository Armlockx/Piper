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
