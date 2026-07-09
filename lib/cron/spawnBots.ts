import { createAdminClient } from "@/lib/supabase/admin";
import { buildBotAvatarDataUrl, generateBotPersona } from "@/lib/cron/generateBot";
import { randInt } from "@/lib/cron/topics";

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function ensureDailyCap(admin: ReturnType<typeof createAdminClient>) {
  const date = todayUtcDate();
  const { data: existing } = await admin
    .from("bot_spawn_daily")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (existing) return existing;

  const daily_cap = randInt(3, 8);
  const { data, error } = await admin
    .from("bot_spawn_daily")
    .insert({ date, spawned_count: 0, daily_cap })
    .select()
    .single();

  if (error) {
    // race: another tick created it
    const { data: again } = await admin
      .from("bot_spawn_daily")
      .select("*")
      .eq("date", date)
      .single();
    return again;
  }
  return data;
}

/**
 * Probabilistic spawn for 5-min ticks.
 * P = baseRate * (1 + elapsedHours/24) * (1 - spawned/cap)
 */
export function spawnProbability(spawned: number, cap: number, now = new Date()): number {
  if (spawned >= cap) return 0;
  const elapsedHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const baseRate = 0.035;
  return baseRate * (1 + elapsedHours / 24) * (1 - spawned / cap);
}

async function insertGeneratedBot(
  admin: ReturnType<typeof createAdminClient>,
  batchId: string
) {
  const { data: bots } = await admin.from("bots").select("handle, archetype");
  const handles = (bots ?? []).map((b) => b.handle as string);
  const archetypes = (bots ?? [])
    .map((b) => b.archetype as string | null)
    .filter((a): a is string => Boolean(a));

  const spec = await generateBotPersona(handles, archetypes);
  if (!spec) return null;

  // Collision retry with suffix
  let handle = spec.handle;
  if (handles.includes(handle)) {
    handle = `${spec.handle.slice(0, 16)}${randInt(10, 99)}`;
    if (handles.includes(handle)) return null;
  }

  const avatar_url = buildBotAvatarDataUrl(spec.name, spec.accent_color);

  const { data, error } = await admin
    .from("bots")
    .insert({
      handle,
      name: spec.name,
      persona_prompt: spec.persona_prompt,
      avatar_url,
      accent_color: spec.accent_color,
      auto_reply_weight: spec.auto_reply_weight,
      is_generated: true,
      archetype: spec.archetype,
      spawn_batch_id: batchId,
      active: true,
    })
    .select("id, handle")
    .single();

  if (error) return null;
  return data;
}

export async function spawnBotIfDue() {
  const admin = createAdminClient();
  const daily = await ensureDailyCap(admin);
  if (!daily) return { botsSpawned: 0, skipped: true as const };

  const p = spawnProbability(daily.spawned_count, daily.daily_cap);
  if (Math.random() >= p) {
    return { botsSpawned: 0, skipped: true as const, daily_cap: daily.daily_cap, spawned_count: daily.spawned_count };
  }

  const batchId = crypto.randomUUID();
  const bot = await insertGeneratedBot(admin, batchId);
  if (!bot) {
    return { botsSpawned: 0, skipped: false as const, failed: true };
  }

  await admin
    .from("bot_spawn_daily")
    .update({
      spawned_count: daily.spawned_count + 1,
      last_spawn_at: new Date().toISOString(),
    })
    .eq("date", daily.date);

  return {
    botsSpawned: 1,
    skipped: false as const,
    handles: [bot.handle],
    daily_cap: daily.daily_cap,
    spawned_count: daily.spawned_count + 1,
  };
}

/** Guaranteed small batch for daily cron. */
export async function spawnBotBatch(count: number) {
  const admin = createAdminClient();
  const daily = await ensureDailyCap(admin);
  if (!daily) return { botsSpawned: 0 };

  const remaining = Math.max(0, daily.daily_cap - daily.spawned_count);
  const n = Math.min(count, remaining, 4);
  if (n <= 0) return { botsSpawned: 0, daily_cap: daily.daily_cap, spawned_count: daily.spawned_count };

  const batchId = crypto.randomUUID();
  const handles: string[] = [];

  for (let i = 0; i < n; i++) {
    const bot = await insertGeneratedBot(admin, batchId);
    if (bot) handles.push(bot.handle);
  }

  if (handles.length > 0) {
    await admin
      .from("bot_spawn_daily")
      .update({
        spawned_count: daily.spawned_count + handles.length,
        last_spawn_at: new Date().toISOString(),
      })
      .eq("date", daily.date);
  }

  return {
    botsSpawned: handles.length,
    handles,
    daily_cap: daily.daily_cap,
    spawned_count: daily.spawned_count + handles.length,
  };
}
