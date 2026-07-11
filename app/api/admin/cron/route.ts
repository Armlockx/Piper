import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/isAdmin";
import { getCronAdminStatus } from "@/lib/cron/adminStatus";
import { getCronSettings, updateCronSettings } from "@/lib/cron/config";

const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const patchSchema = z
  .object({
    enabled: z.boolean().optional(),
    slot_gap_min_minutes: int(1, 720).optional(),
    slot_gap_max_minutes: int(1, 720).optional(),
    planning_horizon_hours: int(1, 48).optional(),
    tick_batch_size: int(1, 10).optional(),
    awake_hour_start: int(0, 23).optional(),
    awake_hour_end: int(0, 23).optional(),
    chain_reply_chance_pct: int(0, 100).optional(),
    chain_reply_delay_min_minutes: int(1, 720).optional(),
    chain_reply_delay_max_minutes: int(1, 720).optional(),
    bot_post_min: int(0, 200).optional(),
    bot_post_max: int(0, 200).optional(),
    bot_reply_bot_min: int(0, 200).optional(),
    bot_reply_bot_max: int(0, 200).optional(),
    bot_reply_user_min: int(0, 200).optional(),
    bot_reply_user_max: int(0, 200).optional(),
    organic_like_min: int(0, 500).optional(),
    organic_like_max: int(0, 500).optional(),
    user_follow_min: int(0, 100).optional(),
    user_follow_max: int(0, 100).optional(),
    bot_follow_min: int(0, 100).optional(),
    bot_follow_max: int(0, 100).optional(),
    soft_unfollow_min: int(0, 50).optional(),
    soft_unfollow_max: int(0, 50).optional(),
    soft_unfollow_chance_pct: int(0, 100).optional(),
    spawn_bot_min: int(0, 20).optional(),
    spawn_bot_max: int(0, 20).optional(),
  })
  .refine(
    (data) =>
      data.slot_gap_min_minutes === undefined ||
      data.slot_gap_max_minutes === undefined ||
      data.slot_gap_max_minutes >= data.slot_gap_min_minutes,
    { message: "Max gap must be >= min gap", path: ["slot_gap_max_minutes"] }
  )
  .refine(
    (data) =>
      data.chain_reply_delay_min_minutes === undefined ||
      data.chain_reply_delay_max_minutes === undefined ||
      data.chain_reply_delay_max_minutes >= data.chain_reply_delay_min_minutes,
    { message: "Max chain delay must be >= min", path: ["chain_reply_delay_max_minutes"] }
  );

function validateMinMaxPairs(body: z.infer<typeof patchSchema>) {
  const pairs: [keyof typeof body, keyof typeof body][] = [
    ["bot_post_min", "bot_post_max"],
    ["bot_reply_bot_min", "bot_reply_bot_max"],
    ["bot_reply_user_min", "bot_reply_user_max"],
    ["organic_like_min", "organic_like_max"],
    ["user_follow_min", "user_follow_max"],
    ["bot_follow_min", "bot_follow_max"],
    ["soft_unfollow_min", "soft_unfollow_max"],
    ["spawn_bot_min", "spawn_bot_max"],
  ];

  for (const [minKey, maxKey] of pairs) {
    const min = body[minKey] as number | undefined;
    const max = body[maxKey] as number | undefined;
    if (min !== undefined && max !== undefined && max < min) {
      return `${String(maxKey)} must be >= ${String(minKey)}`;
    }
  }
  return null;
}

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [settings, status] = await Promise.all([getCronSettings(true), getCronAdminStatus()]);

  return NextResponse.json({ settings, status });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const minMaxError = validateMinMaxPairs(parsed.data);
  if (minMaxError) {
    return NextResponse.json({ error: minMaxError }, { status: 400 });
  }

  try {
    const settings = await updateCronSettings(parsed.data, auth.user.id);
    const status = await getCronAdminStatus();
    return NextResponse.json({ settings, status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
