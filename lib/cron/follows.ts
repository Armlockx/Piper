import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database";
import { pickRandom } from "@/lib/cron/topics";

export async function createUserFollowNow(): Promise<boolean> {
  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("id, handle").limit(100);

  if (!profiles || profiles.length < 2) return false;

  const users = profiles as Pick<Profile, "id" | "handle">[];

  for (let i = 0; i < 8; i++) {
    const [follower, following] = pickRandom(users, 2);
    if (!follower || !following || follower.id === following.id) continue;

    const { data: existing } = await admin
      .from("follows")
      .select("id")
      .eq("follower_id", follower.id)
      .eq("following_id", following.id)
      .maybeSingle();

    if (existing) continue;

    const { error } = await admin.from("follows").insert({
      follower_id: follower.id,
      following_id: following.id,
    });

    if (error) continue;

    await admin.from("notifications").insert({
      user_id: following.id,
      actor_id: follower.id,
      type: "follow",
    });

    return true;
  }

  return false;
}

export async function createBotFollowNow(): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: bots }] = await Promise.all([
    admin.from("profiles").select("id").limit(100),
    admin.from("bots").select("id").eq("active", true),
  ]);

  if (!profiles?.length || !bots?.length) return false;

  for (let i = 0; i < 8; i++) {
    const user = profiles[Math.floor(Math.random() * profiles.length)];
    const bot = bots[Math.floor(Math.random() * bots.length)];

    const { data: existing } = await admin
      .from("bot_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("bot_id", bot.id)
      .maybeSingle();

    if (existing) continue;

    const { error } = await admin.from("bot_follows").insert({
      follower_id: user.id,
      bot_id: bot.id,
    });

    if (!error) return true;
  }

  return false;
}

export async function createSoftUnfollowNow(): Promise<boolean> {
  const admin = createAdminClient();
  const { data: edges } = await admin.from("follows").select("id").limit(50);
  if (!edges?.length) return false;

  const edge = edges[Math.floor(Math.random() * edges.length)];
  const { error } = await admin.from("follows").delete().eq("id", edge.id);
  return !error;
}

/** @deprecated Prefer scheduling + create*Now. */
export async function runRandomUserFollows(maxFollows = 5) {
  let created = 0;
  for (let i = 0; i < maxFollows; i++) {
    if (await createUserFollowNow()) created += 1;
  }
  return { follows: created };
}

/** @deprecated Prefer scheduling + create*Now. */
export async function runUserToBotFollows(maxFollows = 3) {
  let created = 0;
  for (let i = 0; i < maxFollows; i++) {
    if (await createBotFollowNow()) created += 1;
  }
  return { botFollows: created };
}

/** @deprecated Prefer scheduling + create*Now. */
export async function runSoftUnfollows(maxUnfollows = 2) {
  let removed = 0;
  for (let i = 0; i < maxUnfollows; i++) {
    if (await createSoftUnfollowNow()) removed += 1;
  }
  return { unfollows: removed };
}
