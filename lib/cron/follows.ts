import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database";
import { pickRandom } from "@/lib/cron/topics";

export async function runRandomUserFollows(maxFollows = 5) {
  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("id, handle").limit(100);

  if (!profiles || profiles.length < 2) return { follows: 0 };

  const users = profiles as Pick<Profile, "id" | "handle">[];
  let created = 0;
  const attempts = maxFollows * 4;

  for (let i = 0; i < attempts && created < maxFollows; i++) {
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

    created += 1;
  }

  return { follows: created };
}

export async function runUserToBotFollows(maxFollows = 3) {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: bots }] = await Promise.all([
    admin.from("profiles").select("id").limit(100),
    admin.from("bots").select("id"),
  ]);

  if (!profiles?.length || !bots?.length) return { botFollows: 0 };

  let created = 0;
  const attempts = maxFollows * 4;

  for (let i = 0; i < attempts && created < maxFollows; i++) {
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

    if (!error) created += 1;
  }

  return { botFollows: created };
}

export async function runSoftUnfollows(maxUnfollows = 2) {
  const admin = createAdminClient();
  const { data: edges } = await admin.from("follows").select("id").limit(50);
  if (!edges?.length) return { unfollows: 0 };

  const picked = pickRandom(edges, Math.min(maxUnfollows, edges.length));
  let removed = 0;

  for (const edge of picked) {
    const { error } = await admin.from("follows").delete().eq("id", edge.id);
    if (!error) removed += 1;
  }

  return { unfollows: removed };
}
