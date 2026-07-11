import { createAdminClient } from "@/lib/supabase/admin";
import { randInt } from "@/lib/cron/topics";
import {
  buildDayQuotasFromSettings,
  getCronSettings,
} from "@/lib/cron/config";
import type { CronSettings, ScheduledActionType } from "@/lib/types/database";

type PlanItem = {
  action_type: ScheduledActionType;
  payload: Record<string, unknown>;
  execute_at: string;
};

function planDateKey(now = new Date(), timeZone = process.env.PIPER_TZ ?? "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function localHour(date: Date, timeZone: string): number {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).format(date);
  return Number(hourStr) % 24;
}

function isAwakeHour(hour: number, settings: CronSettings): boolean {
  const { awake_hour_start: start, awake_hour_end: end } = settings;
  if (start <= end) return hour >= start && hour <= end;
  return hour >= start || hour <= end;
}

function awakeWeight(date: Date, timeZone: string, settings: CronSettings): number {
  const h = localHour(date, timeZone);
  if (isAwakeHour(h, settings)) return 1;
  const start = settings.awake_hour_start;
  const preStart = (start + 23) % 24;
  if (h >= preStart && h < start) return 0.45;
  return 0.15;
}

function pushSlot(
  slots: Date[],
  candidate: Date,
  timeZone: string,
  settings: CronSettings,
  attempts = 0
): void {
  if (attempts > 12) {
    slots.push(candidate);
    return;
  }

  const minuteKey = Math.floor(candidate.getTime() / 60_000);
  if (slots.some((s) => Math.floor(s.getTime() / 60_000) === minuteKey)) {
    const nudged = new Date(candidate.getTime() + randInt(3, 12) * 60_000);
    pushSlot(slots, nudged, timeZone, settings, attempts + 1);
    return;
  }

  if (Math.random() > awakeWeight(candidate, timeZone, settings) && attempts < 8) {
    const nudged = new Date(candidate.getTime() + randInt(20, 90) * 60_000);
    pushSlot(slots, nudged, timeZone, settings, attempts + 1);
    return;
  }

  slots.push(candidate);
}

/**
 * Spread N timestamps over the planning horizon with configurable gaps + jitter.
 */
export function buildOrganicSlots(
  count: number,
  settings: CronSettings,
  now = new Date()
): Date[] {
  const timeZone = process.env.PIPER_TZ ?? "America/Sao_Paulo";
  const slots: Date[] = [];
  let cursor = new Date(now.getTime() + randInt(5, 25) * 60_000);
  const horizonMs = settings.planning_horizon_hours * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const gapMin = randInt(settings.slot_gap_min_minutes, settings.slot_gap_max_minutes);
    const jitterMin = randInt(-8, 20);
    cursor = new Date(cursor.getTime() + (gapMin + jitterMin) * 60_000);
    const maxHorizon = now.getTime() + horizonMs;
    if (cursor.getTime() > maxHorizon) {
      cursor = new Date(now.getTime() + randInt(30, settings.planning_horizon_hours * 60) * 60_000);
    }
    pushSlot(slots, new Date(cursor), timeZone, settings);
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Plan today's living-feed actions into scheduled_actions.
 * Idempotent per calendar day (PIPER_TZ). Does not publish anything.
 */
export async function planDay() {
  const admin = createAdminClient();
  const settings = await getCronSettings();
  const date = planDateKey();

  if (!settings.enabled) {
    return {
      already_planned: true as const,
      planned: 0,
      date,
      planned_count: 0,
      nextExecuteAt: null,
      disabled: true as const,
    };
  }

  const { data: existing } = await admin
    .from("cron_plan_daily")
    .select("date, planned_count")
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const { data: next } = await admin
      .from("scheduled_actions")
      .select("execute_at")
      .eq("status", "pending")
      .order("execute_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return {
      already_planned: true as const,
      planned: 0,
      date,
      planned_count: existing.planned_count,
      nextExecuteAt: next?.execute_at ?? null,
    };
  }

  const quotas = buildDayQuotasFromSettings(settings);
  const types: ScheduledActionType[] = [];

  (Object.keys(quotas) as ScheduledActionType[]).forEach((type) => {
    const n = quotas[type as keyof typeof quotas] ?? 0;
    for (let i = 0; i < n; i++) types.push(type);
  });

  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  const slots = buildOrganicSlots(types.length, settings);
  const items: PlanItem[] = types.map((action_type, i) => ({
    action_type,
    payload: {},
    execute_at: slots[i].toISOString(),
  }));

  const postSlots = items.filter((x) => x.action_type === "bot_post");
  for (const post of postSlots) {
    if (Math.random() * 100 > settings.chain_reply_chance_pct) continue;
    const delayMin = randInt(
      settings.chain_reply_delay_min_minutes,
      settings.chain_reply_delay_max_minutes
    );
    const execute_at = new Date(
      new Date(post.execute_at).getTime() + delayMin * 60_000
    ).toISOString();
    items.push({
      action_type: "bot_reply_bot",
      payload: { chained_from: "bot_post" },
      execute_at,
    });
  }

  items.sort((a, b) => a.execute_at.localeCompare(b.execute_at));

  const { error: planErr } = await admin.from("cron_plan_daily").insert({
    date,
    planned_count: items.length,
  });

  if (planErr) {
    return {
      already_planned: true as const,
      planned: 0,
      date,
      planned_count: 0,
      nextExecuteAt: null,
    };
  }

  const { error: insertErr } = await admin.from("scheduled_actions").insert(
    items.map((item) => ({
      action_type: item.action_type,
      payload: item.payload,
      execute_at: item.execute_at,
      status: "pending",
    }))
  );

  if (insertErr) {
    throw new Error(insertErr.message);
  }

  return {
    already_planned: false as const,
    planned: items.length,
    date,
    planned_count: items.length,
    nextExecuteAt: items[0]?.execute_at ?? null,
    quotas: { ...quotas, chained_replies: items.length - types.length },
  };
}
