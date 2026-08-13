import { createAdminClient } from "@/lib/supabase/admin";

export type CronAdminAction =
  | "clear_pending"
  | "clear_all"
  | "reset_plan"
  | "retry_failed"
  | "replan"
  | "run_due"
  | "run_all_pending";

export const CRON_ADMIN_ACTIONS = [
  "clear_pending",
  "clear_all",
  "reset_plan",
  "retry_failed",
  "replan",
  "run_due",
  "run_all_pending",
] as const;

export function parseCronAdminAction(raw: unknown): CronAdminAction | null {
  return typeof raw === "string" && (CRON_ADMIN_ACTIONS as readonly string[]).includes(raw)
    ? (raw as CronAdminAction)
    : null;
}

export type CronAdminStore = {
  deletePending(): Promise<number>;
  deleteAllActions(): Promise<number>;
  deletePlan(date: string): Promise<boolean>;
  retryFailed(): Promise<number>;
  setPendingExecuteAt(iso: string): Promise<number>;
  countPending(): Promise<number>;
};

export type ProcessDueFn = (max: number) => Promise<{
  dueProcessed: number;
  failed: number;
  nextExecuteAt: string | null;
  posts: number;
  botReplies: number;
  userReplies: number;
  likes: number;
  follows: number;
  botFollows: number;
  unfollows: number;
  botsSpawned: number;
}>;

export type PlanDayFn = () => Promise<{
  already_planned: boolean;
  planned: number;
  date: string;
  planned_count: number;
  nextExecuteAt: string | null;
  disabled?: boolean;
}>;

export type CronAdminActionResult = {
  deleted?: number;
  retried?: number;
  already_planned?: boolean;
  planned?: number;
  planned_count?: number;
  date?: string;
  timedOut?: boolean;
  remaining?: number;
  dueProcessed?: number;
  failed?: number;
  nextExecuteAt?: string | null;
  posts?: number;
  botReplies?: number;
  userReplies?: number;
  likes?: number;
  follows?: number;
  botFollows?: number;
  unfollows?: number;
  botsSpawned?: number;
};

export function createSupabaseCronAdminStore(): CronAdminStore {
  const admin = createAdminClient();
  return {
    async deletePending() {
      const { data, error } = await admin
        .from("scheduled_actions")
        .delete()
        .eq("status", "pending")
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
    async deleteAllActions() {
      const { data, error } = await admin
        .from("scheduled_actions")
        .delete()
        .not("id", "is", null)
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
    async deletePlan(date) {
      const { data, error } = await admin.from("cron_plan_daily").delete().eq("date", date).select("date");
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    async retryFailed() {
      const { data, error } = await admin
        .from("scheduled_actions")
        .update({ status: "pending", error: null, processed_at: null })
        .eq("status", "failed")
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
    async setPendingExecuteAt(iso) {
      const { data, error } = await admin
        .from("scheduled_actions")
        .update({ execute_at: iso })
        .eq("status", "pending")
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
    async countPending() {
      const { count, error } = await admin
        .from("scheduled_actions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  };
}

export async function runCronAdminAction(input: {
  action: CronAdminAction;
  store: CronAdminStore;
  tickBatchSize: number;
  planDate: string;
  planDay: PlanDayFn;
  processDue: ProcessDueFn;
  now?: Date;
  timeBudgetMs?: number;
}): Promise<CronAdminActionResult> {
  switch (input.action) {
    case "clear_pending":
      return { deleted: await input.store.deletePending() };
    case "clear_all":
      return { deleted: await input.store.deleteAllActions() };
    case "reset_plan":
      await input.store.deletePlan(input.planDate);
      return {};
    case "retry_failed":
      return { retried: await input.store.retryFailed() };
    case "replan": {
      const plan = await input.planDay();
      return {
        already_planned: plan.already_planned,
        planned: plan.planned,
        planned_count: plan.planned_count,
        date: plan.date,
        nextExecuteAt: plan.nextExecuteAt,
      };
    }
    case "run_due": {
      const tick = await input.processDue(input.tickBatchSize);
      return {
        dueProcessed: tick.dueProcessed,
        failed: tick.failed,
        nextExecuteAt: tick.nextExecuteAt,
        posts: tick.posts,
        botReplies: tick.botReplies,
        userReplies: tick.userReplies,
        likes: tick.likes,
        follows: tick.follows,
        botFollows: tick.botFollows,
        unfollows: tick.unfollows,
        botsSpawned: tick.botsSpawned,
      };
    }
    case "run_all_pending": {
      const started = (input.now ?? new Date()).getTime();
      const budget = input.timeBudgetMs ?? 240_000;
      await input.store.setPendingExecuteAt(new Date(started).toISOString());
      let dueProcessed = 0;
      let failed = 0;
      const counters = {
        posts: 0,
        botReplies: 0,
        userReplies: 0,
        likes: 0,
        follows: 0,
        botFollows: 0,
        unfollows: 0,
        botsSpawned: 0,
      };
      while (Date.now() - started < budget) {
        const tick = await input.processDue(input.tickBatchSize);
        dueProcessed += tick.dueProcessed;
        failed += tick.failed;
        counters.posts += tick.posts;
        counters.botReplies += tick.botReplies;
        counters.userReplies += tick.userReplies;
        counters.likes += tick.likes;
        counters.follows += tick.follows;
        counters.botFollows += tick.botFollows;
        counters.unfollows += tick.unfollows;
        counters.botsSpawned += tick.botsSpawned;
        if (tick.dueProcessed === 0 && tick.failed === 0) break;
      }
      const remaining = await input.store.countPending();
      return {
        dueProcessed,
        failed,
        remaining,
        timedOut: remaining > 0,
        ...counters,
      };
    }
    default:
      throw new Error("Unknown cron action");
  }
}
