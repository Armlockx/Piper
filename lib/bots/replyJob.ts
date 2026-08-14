import type { BotTrigger, LlmJobType, ReplySource } from "@/lib/types/database";

export function replySourceForTrigger(trigger: BotTrigger): ReplySource {
  if (trigger === "mention") return "bot_mention";
  if (trigger === "cron") return "bot_cron";
  return "bot_auto";
}

export function llmJobTypeForTrigger(trigger: BotTrigger): LlmJobType {
  if (trigger === "mention") return "feed_mention";
  if (trigger === "cron") return "cron_reply";
  return "feed_auto";
}

export function cronReplyJobInsert(
  botId: string,
  target: { id: string; root_post_id: string | null }
) {
  return {
    post_id: target.id,
    bot_id: botId,
    trigger: "cron" as const,
    root_post_id: target.root_post_id ?? target.id,
  };
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function isRecentFailedJob(
  status: string | null | undefined,
  processedAt: string | null | undefined,
  now = Date.now(),
  windowMs = FIVE_MINUTES_MS
): boolean {
  if (status !== "failed" || !processedAt) return false;
  const at = Date.parse(processedAt);
  if (Number.isNaN(at)) return false;
  return now - at < windowMs;
}
