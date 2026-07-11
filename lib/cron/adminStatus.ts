import { createAdminClient } from "@/lib/supabase/admin";
import { getCronSettings } from "@/lib/cron/config";
import type { CronSettings } from "@/lib/types/database";

function planDateKey(now = new Date(), timeZone = process.env.PIPER_TZ ?? "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type CronAdminStatus = {
  date: string;
  timezone: string;
  plannedToday: boolean;
  plannedCount: number;
  pending: number;
  processing: number;
  done: number;
  failed: number;
  nextExecuteAt: string | null;
  estimatedDailyActions: {
    min: number;
    max: number;
  };
};

function estimateDailyActions(settings: CronSettings) {
  const baseMin =
    settings.bot_post_min +
    settings.bot_reply_bot_min +
    settings.bot_reply_user_min +
    settings.organic_like_min +
    settings.user_follow_min +
    settings.bot_follow_min +
    settings.spawn_bot_min;

  const baseMax =
    settings.bot_post_max +
    settings.bot_reply_bot_max +
    settings.bot_reply_user_max +
    settings.organic_like_max +
    settings.user_follow_max +
    settings.bot_follow_max +
    settings.spawn_bot_max;

  const softMin =
    settings.soft_unfollow_chance_pct > 0 ? settings.soft_unfollow_min : 0;
  const softMax =
    settings.soft_unfollow_chance_pct > 0 ? settings.soft_unfollow_max : 0;

  const chainMin = Math.floor((settings.bot_post_min * settings.chain_reply_chance_pct) / 100);
  const chainMax = Math.ceil((settings.bot_post_max * settings.chain_reply_chance_pct) / 100);

  return {
    min: baseMin + softMin + chainMin,
    max: baseMax + softMax + chainMax,
  };
}

export async function getCronAdminStatus(): Promise<CronAdminStatus> {
  const admin = createAdminClient();
  const settings = await getCronSettings();
  const date = planDateKey();
  const timezone = process.env.PIPER_TZ ?? "America/Sao_Paulo";

  const [{ data: plan }, pendingRes, processingRes, doneRes, failedRes, { data: next }] =
    await Promise.all([
      admin.from("cron_plan_daily").select("planned_count").eq("date", date).maybeSingle(),
      admin
        .from("scheduled_actions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      admin
        .from("scheduled_actions")
        .select("*", { count: "exact", head: true })
        .eq("status", "processing"),
      admin
        .from("scheduled_actions")
        .select("*", { count: "exact", head: true })
        .eq("status", "done"),
      admin
        .from("scheduled_actions")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed"),
      admin
        .from("scheduled_actions")
        .select("execute_at")
        .eq("status", "pending")
        .order("execute_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  return {
    date,
    timezone,
    plannedToday: Boolean(plan),
    plannedCount: plan?.planned_count ?? 0,
    pending: pendingRes.count ?? 0,
    processing: processingRes.count ?? 0,
    done: doneRes.count ?? 0,
    failed: failedRes.count ?? 0,
    nextExecuteAt: next?.execute_at ?? null,
    estimatedDailyActions: estimateDailyActions(settings),
  };
}
