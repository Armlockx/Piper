import { describe, expect, it } from "vitest";
import {
  addDays,
  aggregateDays,
  decodeActionCursor,
  encodeActionCursor,
  listCronDayActions,
  listCronReport,
  parseActionsQuery,
  parseReportQuery,
  reportRange,
  utcBoundsForDate,
  type CronReportRow,
  type CronReportStore,
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

