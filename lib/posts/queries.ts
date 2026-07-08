import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor } from "@/lib/types/database";

const POST_SELECT = "*, profiles(*), bots(*)";

export async function getGlobalFeed(limit = 50): Promise<PostWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("parent_post_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return enrichWithLikes(data as PostWithAuthor[]);
}

export async function getFollowingFeed(userId: string, limit = 50): Promise<PostWithAuthor[]> {
  const supabase = await createClient();

  const [{ data: userFollows }, { data: botFollows }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", userId),
    supabase.from("bot_follows").select("bot_id").eq("follower_id", userId),
  ]);

  const followingUserIds = (userFollows ?? []).map((f) => f.following_id);
  const followingBotIds = (botFollows ?? []).map((f) => f.bot_id);

  if (followingUserIds.length === 0 && followingBotIds.length === 0) {
    return [];
  }

  const results: PostWithAuthor[] = [];

  if (followingUserIds.length > 0) {
    const { data } = await supabase
      .from("posts")
      .select(POST_SELECT)
      .is("parent_post_id", null)
      .in("author_id", followingUserIds)
      .eq("author_type", "user")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) results.push(...(data as PostWithAuthor[]));
  }

  if (followingBotIds.length > 0) {
    const { data } = await supabase
      .from("posts")
      .select(POST_SELECT)
      .is("parent_post_id", null)
      .in("bot_id", followingBotIds)
      .eq("author_type", "bot")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) results.push(...(data as PostWithAuthor[]));
  }

  const merged = results
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  return enrichWithLikes(merged);
}

export async function getThread(rootId: string): Promise<PostWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .or(`id.eq.${rootId},root_post_id.eq.${rootId}`)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return enrichWithLikes(data as PostWithAuthor[]);
}

export async function getUserPosts(handle: string): Promise<{ profile: unknown; posts: PostWithAuthor[] }> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  if (!profile && !bot) {
    return { profile: null, posts: [] };
  }

  let query = supabase.from("posts").select(POST_SELECT).is("parent_post_id", null);

  if (profile) {
    query = query.eq("author_id", profile.id).eq("author_type", "user");
  } else if (bot) {
    query = query.eq("bot_id", bot.id).eq("author_type", "bot");
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
  if (error) throw error;

  return {
    profile: profile ?? bot,
    posts: await enrichWithLikes(data as PostWithAuthor[]),
  };
}

async function enrichWithLikes(posts: PostWithAuthor[]): Promise<PostWithAuthor[]> {
  if (posts.length === 0) return posts;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return posts.map((p) => ({ ...p, liked_by_me: false }));

  const ids = posts.map((p) => p.id);
  const { data: likes } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", user.id)
    .in("post_id", ids);

  const likedSet = new Set((likes ?? []).map((l) => l.post_id));
  return posts.map((p) => ({ ...p, liked_by_me: likedSet.has(p.id) }));
}

export async function getBots() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bots").select("*").order("handle");
  if (error) throw error;
  return data;
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  return count ?? 0;
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
}
