import { createAdminClient } from "@/lib/supabase/admin";
import { createBotPostNow } from "@/lib/cron/posts";
import { createBotToBotReplyNow, createBotToUserReplyNow } from "@/lib/cron/replies";
import { createOrganicLikeNow } from "@/lib/cron/likes";
import {
  createBotFollowNow,
  createSoftUnfollowNow,
  createUserFollowNow,
} from "@/lib/cron/follows";
import { spawnBotBatch } from "@/lib/cron/spawnBots";
import type { ScheduledAction, ScheduledActionType } from "@/lib/types/database";

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

async function runAction(action: ScheduledAction): Promise<keyof typeof emptyCounters | null> {
  const payload = (action.payload ?? {}) as { bot_id?: string };
  const type = action.action_type as ScheduledActionType;

  switch (type) {
    case "bot_post":
      return (await createBotPostNow(payload.bot_id)) ? "posts" : null;
    case "bot_reply_bot":
      return (await createBotToBotReplyNow(payload.bot_id)) ? "botReplies" : null;
    case "bot_reply_user":
      return (await createBotToUserReplyNow(payload.bot_id)) ? "userReplies" : null;
    case "organic_like":
      return (await createOrganicLikeNow()) ? "likes" : null;
    case "user_follow":
      return (await createUserFollowNow()) ? "follows" : null;
    case "bot_follow":
      return (await createBotFollowNow()) ? "botFollows" : null;
    case "soft_unfollow":
      return (await createSoftUnfollowNow()) ? "unfollows" : null;
    case "spawn_bot": {
      const result = await spawnBotBatch(1);
      return result.botsSpawned > 0 ? "botsSpawned" : null;
    }
    default:
      return null;
  }
}

/**
 * Claim and execute up to `max` due scheduled actions.
 * Publishes with created_at = now (no backdating).
 */
export async function processDueActions(max = 2) {
  const admin = createAdminClient();
  const counters = { ...emptyCounters };
  let dueProcessed = 0;
  let failed = 0;

  const { data: claimed, error: claimError } = await admin.rpc("claim_due_scheduled_actions", {
    max_count: max,
  });

  if (claimError) {
    // Fallback without SKIP LOCKED if RPC missing (migration not applied yet)
    const { data: due } = await admin
      .from("scheduled_actions")
      .select("*")
      .eq("status", "pending")
      .lte("execute_at", new Date().toISOString())
      .order("execute_at", { ascending: true })
      .limit(max);

    if (!due?.length) {
      const { data: next } = await admin
        .from("scheduled_actions")
        .select("execute_at")
        .eq("status", "pending")
        .order("execute_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return {
        dueProcessed: 0,
        failed: 0,
        nextExecuteAt: next?.execute_at ?? null,
        ...counters,
        claimError: claimError.message,
      };
    }

    for (const row of due as ScheduledAction[]) {
      await admin.from("scheduled_actions").update({ status: "processing" }).eq("id", row.id);
      try {
        const key = await runAction(row);
        if (key) {
          counters[key] += 1;
          dueProcessed += 1;
        }
        await admin
          .from("scheduled_actions")
          .update({ status: "done", processed_at: new Date().toISOString() })
          .eq("id", row.id);
      } catch (e) {
        failed += 1;
        await admin
          .from("scheduled_actions")
          .update({
            status: "failed",
            error: e instanceof Error ? e.message : "Unknown error",
            processed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
    }
  } else {
    const rows = (claimed ?? []) as ScheduledAction[];
    for (const row of rows) {
      try {
        const key = await runAction(row);
        if (key) {
          counters[key] += 1;
          dueProcessed += 1;
        }
        await admin
          .from("scheduled_actions")
          .update({ status: "done", processed_at: new Date().toISOString() })
          .eq("id", row.id);
      } catch (e) {
        failed += 1;
        await admin
          .from("scheduled_actions")
          .update({
            status: "failed",
            error: e instanceof Error ? e.message : "Unknown error",
            processed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
    }
  }

  const { data: next } = await admin
    .from("scheduled_actions")
    .select("execute_at")
    .eq("status", "pending")
    .order("execute_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    dueProcessed,
    failed,
    nextExecuteAt: next?.execute_at ?? null,
    ...counters,
  };
}
