import { planDay } from "@/lib/cron/schedulePlan";
import { processDueActions } from "@/lib/cron/processDue";
import { getCronSettings } from "@/lib/cron/config";

export type CronMode = "daily" | "tick";

const emptyCounters = {
  posts: 0,
  botReplies: 0,
  userReplies: 0,
  likes: 0,
  follows: 0,
  botFollows: 0,
  unfollows: 0,
  botsSpawned: 0,
};

/**
 * Light tick: process due scheduled actions (real publish time = now).
 */
export async function runCronTick() {
  const settings = await getCronSettings();

  if (!settings.enabled) {
    return {
      ok: true,
      mode: "tick" as const,
      skipped: true,
      disabled: true as const,
      planned: 0,
      dueProcessed: 0,
      failed: 0,
      nextExecuteAt: null,
      ...emptyCounters,
      at: new Date().toISOString(),
    };
  }

  const result = await processDueActions(settings.tick_batch_size);
  const skipped = result.dueProcessed === 0 && result.failed === 0;

  return {
    ok: true,
    mode: "tick" as const,
    skipped,
    planned: 0,
    dueProcessed: result.dueProcessed,
    failed: result.failed,
    nextExecuteAt: result.nextExecuteAt,
    tickBatchSize: settings.tick_batch_size,
    ...emptyCounters,
    posts: result.posts,
    botReplies: result.botReplies,
    userReplies: result.userReplies,
    likes: result.likes,
    follows: result.follows,
    botFollows: result.botFollows,
    unfollows: result.unfollows,
    botsSpawned: result.botsSpawned,
    at: new Date().toISOString(),
  };
}

/**
 * Daily planner: enqueue organic actions with future execute_at.
 */
export async function runCronDaily() {
  const plan = await planDay();

  return {
    ok: true,
    mode: "daily" as const,
    skipped: plan.already_planned,
    already_planned: plan.already_planned,
    planned: plan.planned,
    planned_count: plan.planned_count,
    date: plan.date,
    nextExecuteAt: plan.nextExecuteAt,
    disabled: "disabled" in plan ? plan.disabled : undefined,
    quotas: "quotas" in plan ? plan.quotas : undefined,
    dueProcessed: 0,
    ...emptyCounters,
    at: new Date().toISOString(),
  };
}

export async function runCronActivity(mode: CronMode = "daily") {
  return mode === "tick" ? runCronTick() : runCronDaily();
}
