import { createAdminClient } from "@/lib/supabase/admin";
import type { CronSettings, ScheduledActionType } from "@/lib/types/database";
import { randInt } from "@/lib/cron/topics";

export const DEFAULT_CRON_SETTINGS: CronSettings = {
  id: 1,
  enabled: true,
  slot_gap_min_minutes: 8,
  slot_gap_max_minutes: 90,
  planning_horizon_hours: 22,
  tick_batch_size: 2,
  awake_hour_start: 10,
  awake_hour_end: 23,
  chain_reply_chance_pct: 30,
  chain_reply_delay_min_minutes: 15,
  chain_reply_delay_max_minutes: 120,
  bot_post_min: 6,
  bot_post_max: 10,
  bot_reply_bot_min: 4,
  bot_reply_bot_max: 8,
  bot_reply_user_min: 2,
  bot_reply_user_max: 5,
  organic_like_min: 15,
  organic_like_max: 30,
  user_follow_min: 3,
  user_follow_max: 6,
  bot_follow_min: 2,
  bot_follow_max: 4,
  soft_unfollow_min: 0,
  soft_unfollow_max: 2,
  soft_unfollow_chance_pct: 50,
  spawn_bot_min: 2,
  spawn_bot_max: 4,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
};

export type CronSettingsPatch = Partial<
  Omit<CronSettings, "id" | "updated_at" | "updated_by">
>;

let cachedSettings: CronSettings | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

export async function getCronSettings(force = false): Promise<CronSettings> {
  const now = Date.now();
  if (!force && cachedSettings && now - cachedAt < CACHE_MS) {
    return cachedSettings;
  }

  const admin = createAdminClient();
  const { data } = await admin.from("cron_settings").select("*").eq("id", 1).maybeSingle();

  const settings = data ? { ...DEFAULT_CRON_SETTINGS, ...data } : DEFAULT_CRON_SETTINGS;
  cachedSettings = settings;
  cachedAt = now;
  return settings;
}

export function invalidateCronSettingsCache() {
  cachedSettings = null;
  cachedAt = 0;
}

export async function updateCronSettings(
  patch: CronSettingsPatch,
  updatedBy: string
): Promise<CronSettings> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cron_settings")
    .update({
      ...patch,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  invalidateCronSettingsCache();
  return { ...DEFAULT_CRON_SETTINGS, ...data };
}

export function buildDayQuotasFromSettings(settings: CronSettings) {
  const softUnfollow =
    Math.random() * 100 < settings.soft_unfollow_chance_pct
      ? randInt(settings.soft_unfollow_min, settings.soft_unfollow_max)
      : 0;

  return {
    bot_post: randInt(settings.bot_post_min, settings.bot_post_max),
    bot_reply_bot: randInt(settings.bot_reply_bot_min, settings.bot_reply_bot_max),
    bot_reply_user: randInt(settings.bot_reply_user_min, settings.bot_reply_user_max),
    organic_like: randInt(settings.organic_like_min, settings.organic_like_max),
    user_follow: randInt(settings.user_follow_min, settings.user_follow_max),
    bot_follow: randInt(settings.bot_follow_min, settings.bot_follow_max),
    soft_unfollow: softUnfollow,
    spawn_bot: randInt(settings.spawn_bot_min, settings.spawn_bot_max),
  } satisfies Record<ScheduledActionType, number>;
}
