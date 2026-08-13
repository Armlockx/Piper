export type CronAdminAction =
  | "clear_pending"
  | "clear_all"
  | "reset_plan"
  | "retry_failed"
  | "replan"
  | "run_due"
  | "run_all_pending";

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
    default:
      throw new Error("Unknown cron action");
  }
}
