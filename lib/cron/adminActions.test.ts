import { describe, expect, it } from "vitest";
import {
  runCronAdminAction,
  type CronAdminStore,
} from "@/lib/cron/adminActions";

function memoryStore(seed?: {
  pending?: number;
  done?: number;
  failed?: number;
  planDates?: string[];
}): CronAdminStore & { snapshot: () => { pending: number; done: number; failed: number; plans: string[] } } {
  let pending = seed?.pending ?? 0;
  let done = seed?.done ?? 0;
  let failed = seed?.failed ?? 0;
  let plans = [...(seed?.planDates ?? [])];
  return {
    async deletePending() {
      const n = pending;
      pending = 0;
      return n;
    },
    async deleteAllActions() {
      const n = pending + done + failed;
      pending = 0;
      done = 0;
      failed = 0;
      return n;
    },
    async deletePlan(date) {
      const before = plans.length;
      plans = plans.filter((d) => d !== date);
      return plans.length !== before;
    },
    async retryFailed() {
      const n = failed;
      pending += failed;
      failed = 0;
      return n;
    },
    async setPendingExecuteAt() {
      return pending;
    },
    async countPending() {
      return pending;
    },
    snapshot: () => ({ pending, done, failed, plans }),
  };
}

const noopPlanDay = async () => ({
  already_planned: false as const,
  planned: 0,
  date: "2026-08-12",
  planned_count: 0,
  nextExecuteAt: null,
});

const noopProcessDue = async () => ({
  dueProcessed: 0,
  failed: 0,
  nextExecuteAt: null,
  posts: 0,
  botReplies: 0,
  userReplies: 0,
  likes: 0,
  follows: 0,
  botFollows: 0,
  unfollows: 0,
  botsSpawned: 0,
});

describe("runCronAdminAction", () => {
  it("clear_pending does not delete done rows", async () => {
    const store = memoryStore({ pending: 3, done: 5, failed: 1 });
    const result = await runCronAdminAction({
      action: "clear_pending",
      store,
      tickBatchSize: 2,
      planDate: "2026-08-12",
      planDay: noopPlanDay,
      processDue: noopProcessDue,
    });
    expect(result.deleted).toBe(3);
    expect(store.snapshot()).toMatchObject({ pending: 0, done: 5, failed: 1 });
  });

  it("clear_all empties every status", async () => {
    const store = memoryStore({ pending: 1, done: 2, failed: 3 });
    await runCronAdminAction({
      action: "clear_all",
      store,
      tickBatchSize: 2,
      planDate: "2026-08-12",
      planDay: noopPlanDay,
      processDue: noopProcessDue,
    });
    expect(store.snapshot()).toMatchObject({ pending: 0, done: 0, failed: 0 });
  });

  it("retry_failed only moves failed rows to pending", async () => {
    const store = memoryStore({ pending: 1, done: 4, failed: 2 });
    const result = await runCronAdminAction({
      action: "retry_failed",
      store,
      tickBatchSize: 2,
      planDate: "2026-08-12",
      planDay: noopPlanDay,
      processDue: noopProcessDue,
    });
    expect(result.retried).toBe(2);
    expect(store.snapshot()).toMatchObject({ pending: 3, done: 4, failed: 0 });
  });

  it("reset_plan deletes only today's plan row", async () => {
    const store = memoryStore({ planDates: ["2026-08-12", "2026-08-11"] });
    await runCronAdminAction({
      action: "reset_plan",
      store,
      tickBatchSize: 2,
      planDate: "2026-08-12",
      planDay: noopPlanDay,
      processDue: noopProcessDue,
    });
    expect(store.snapshot().plans).toEqual(["2026-08-11"]);
  });

  it("replan returns already_planned from planDay", async () => {
    const result = await runCronAdminAction({
      action: "replan",
      store: memoryStore(),
      tickBatchSize: 2,
      planDate: "2026-08-12",
      planDay: async () => ({
        already_planned: true,
        planned: 0,
        date: "2026-08-12",
        planned_count: 9,
        nextExecuteAt: null,
      }),
      processDue: noopProcessDue,
    });
    expect(result.already_planned).toBe(true);
    expect(result.planned_count).toBe(9);
  });
});
