import { planDay } from "@/lib/cron/schedulePlan";
import { processDueActions } from "@/lib/cron/processDue";

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
 * Light tick: process 1–2 due scheduled actions (real publish time = now).
 * Spawn is planned in the daily queue as `spawn_bot` — no separate roll.
 */
export async function runCronTick() {
  const result = await processDueActions(2);
  const skipped = result.dueProcessed === 0 && result.failed === 0;

  return {
    ok: true,
    mode: "tick" as const,
    skipped,
    planned: 0,
    dueProcessed: result.dueProcessed,
    failed: result.failed,
    nextExecuteAt: result.nextExecuteAt,
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
 * Does not publish posts/likes immediately.
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
    quotas: "quotas" in plan ? plan.quotas : undefined,
    dueProcessed: 0,
    ...emptyCounters,
    at: new Date().toISOString(),
  };
}

export async function runCronActivity(mode: CronMode = "daily") {
  return mode === "tick" ? runCronTick() : runCronDaily();
}
