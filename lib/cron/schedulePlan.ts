import { createAdminClient } from "@/lib/supabase/admin";
import { randInt } from "@/lib/cron/topics";
import type { ScheduledActionType } from "@/lib/types/database";

type PlanItem = {
  action_type: ScheduledActionType;
  payload: Record<string, unknown>;
  execute_at: string;
};

function planDateKey(now = new Date(), timeZone = process.env.PIPER_TZ ?? "America/Sao_Paulo"): string {
  // YYYY-MM-DD in app timezone
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

/** Prefer awake hours (10–23) in PIPER_TZ without a rigid grid. */
function awakeWeight(date: Date, timeZone: string): number {
  const h = localHour(date, timeZone);
  if (h >= 10 && h <= 23) return 1;
  if (h >= 7 && h < 10) return 0.45;
  return 0.15;
}

function pushSlot(
  slots: Date[],
  candidate: Date,
  timeZone: string,
  attempts = 0
): void {
  if (attempts > 12) {
    slots.push(candidate);
    return;
  }

  // Avoid same-minute clusters
  const minuteKey = Math.floor(candidate.getTime() / 60_000);
  if (slots.some((s) => Math.floor(s.getTime() / 60_000) === minuteKey)) {
    const nudged = new Date(candidate.getTime() + randInt(3, 12) * 60_000);
    pushSlot(slots, nudged, timeZone, attempts + 1);
    return;
  }

  // Soft reject sleepy hours
  if (Math.random() > awakeWeight(candidate, timeZone) && attempts < 8) {
    const nudged = new Date(candidate.getTime() + randInt(20, 90) * 60_000);
    pushSlot(slots, nudged, timeZone, attempts + 1);
    return;
  }

  slots.push(candidate);
}

/**
 * Spread N timestamps over the next ~18–22h with random gaps (8–90 min) + jitter.
 */
export function buildOrganicSlots(count: number, now = new Date()): Date[] {
  const timeZone = process.env.PIPER_TZ ?? "America/Sao_Paulo";
  const slots: Date[] = [];
  let cursor = new Date(now.getTime() + randInt(5, 25) * 60_000);

  for (let i = 0; i < count; i++) {
    const gapMin = randInt(8, 90);
    const jitterMin = randInt(-8, 20);
    cursor = new Date(cursor.getTime() + (gapMin + jitterMin) * 60_000);
    // Cap horizon ~22h
    const maxHorizon = now.getTime() + 22 * 60 * 60 * 1000;
    if (cursor.getTime() > maxHorizon) {
      cursor = new Date(now.getTime() + randInt(30, 22 * 60) * 60_000);
    }
    pushSlot(slots, new Date(cursor), timeZone);
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

function buildDayQuotas() {
  return {
    bot_post: randInt(6, 10),
    bot_reply_bot: randInt(4, 8),
    bot_reply_user: randInt(2, 5),
    organic_like: randInt(15, 30),
    user_follow: randInt(3, 6),
    bot_follow: randInt(2, 4),
    soft_unfollow: Math.random() < 0.5 ? randInt(0, 2) : 0,
    spawn_bot: randInt(2, 4),
  } as const;
}

/**
 * Plan today's living-feed actions into scheduled_actions.
 * Idempotent per calendar day (PIPER_TZ). Does not publish anything.
 */
export async function planDay() {
  const admin = createAdminClient();
  const date = planDateKey();

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

  const quotas = buildDayQuotas();
  const types: ScheduledActionType[] = [];

  (Object.keys(quotas) as ScheduledActionType[]).forEach((type) => {
    const n = quotas[type as keyof typeof quotas] ?? 0;
    for (let i = 0; i < n; i++) types.push(type);
  });

  // Shuffle action types so likes aren't all clustered by type
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  const slots = buildOrganicSlots(types.length);
  const items: PlanItem[] = types.map((action_type, i) => ({
    action_type,
    payload: {},
    execute_at: slots[i].toISOString(),
  }));

  // Chain: ~30% of bot_post get a follow-up bot_reply_bot 15–120 min later
  const postSlots = items.filter((x) => x.action_type === "bot_post");
  for (const post of postSlots) {
    if (Math.random() > 0.3) continue;
    const delayMin = randInt(15, 120);
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

  // Insert plan marker first (unique date) — race-safe
  const { error: planErr } = await admin.from("cron_plan_daily").insert({
    date,
    planned_count: items.length,
  });

  if (planErr) {
    // Another tick/daily won the race
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
