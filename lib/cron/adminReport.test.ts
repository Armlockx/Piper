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
