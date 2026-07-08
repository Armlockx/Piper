import type { SupabaseClient } from "@supabase/supabase-js";

export type FollowTarget =
  | { type: "user"; id: string; handle: string }
  | { type: "bot"; id: string; handle: string };

export async function resolveFollowTarget(
  supabase: SupabaseClient,
  handle: string
): Promise<FollowTarget | null> {
  const normalized = handle.toLowerCase();

  const { data: bot } = await supabase
    .from("bots")
    .select("id, handle")
    .ilike("handle", normalized)
    .maybeSingle();

  if (bot) return { type: "bot", id: bot.id, handle: bot.handle };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle")
    .ilike("handle", normalized)
    .maybeSingle();

  if (profile) return { type: "user", id: profile.id, handle: profile.handle };

  return null;
}

export async function isFollowing(
  supabase: SupabaseClient,
  followerId: string,
  target: FollowTarget
): Promise<boolean> {
  if (target.type === "user") {
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", target.id)
      .maybeSingle();
    return !!data;
  }

  const { data } = await supabase
    .from("bot_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("bot_id", target.id)
    .maybeSingle();
  return !!data;
}

export async function toggleFollow(
  supabase: SupabaseClient,
  followerId: string,
  target: FollowTarget
): Promise<boolean> {
  if (target.type === "user") {
    if (target.id === followerId) {
      throw new Error("Cannot follow yourself");
    }

    const { data: existing } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", target.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("follows").delete().eq("id", existing.id);
      return false;
    }

    await supabase.from("follows").insert({
      follower_id: followerId,
      following_id: target.id,
    });

    await supabase.from("notifications").insert({
      user_id: target.id,
      actor_id: followerId,
      type: "follow",
    });

    return true;
  }

  const { data: existing } = await supabase
    .from("bot_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("bot_id", target.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("bot_follows").delete().eq("id", existing.id);
    return false;
  }

  await supabase.from("bot_follows").insert({
    follower_id: followerId,
    bot_id: target.id,
  });

  return true;
}

export async function getFollowerCount(
  supabase: SupabaseClient,
  target: FollowTarget
): Promise<number> {
  if (target.type === "user") {
    const { count } = await supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", target.id);
    return count ?? 0;
  }

  const { count } = await supabase
    .from("bot_follows")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", target.id);
  return count ?? 0;
}

export async function getFollowingCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const [{ count: users }, { count: bots }] = await Promise.all([
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),
    supabase
      .from("bot_follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  return (users ?? 0) + (bots ?? 0);
}
