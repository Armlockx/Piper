import { createAdminClient } from "@/lib/supabase/admin";
import { pickRandom } from "@/lib/cron/topics";

/** One organic like now. */
export async function createOrganicLikeNow(): Promise<boolean> {
  const admin = createAdminClient();

  const { data: profiles } = await admin.from("profiles").select("id").limit(80);
  if (!profiles?.length) return false;

  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await admin
    .from("posts")
    .select("id, author_id")
    .is("parent_post_id", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!posts?.length) return false;

  for (let i = 0; i < 8; i++) {
    const post = posts[Math.floor(Math.random() * posts.length)];
    const liker = profiles[Math.floor(Math.random() * profiles.length)];
    if (post.author_id && post.author_id === liker.id) continue;

    const { data: existing } = await admin
      .from("post_likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", liker.id)
      .maybeSingle();

    if (existing) continue;

    const { error } = await admin.from("post_likes").insert({
      post_id: post.id,
      user_id: liker.id,
    });

    if (error) continue;

    if (post.author_id && post.author_id !== liker.id) {
      await admin.from("notifications").insert({
        user_id: post.author_id,
        actor_id: liker.id,
        type: "like",
        post_id: post.id,
      });
    }

    return true;
  }

  return false;
}

/**
 * Organic likes: use real user profiles as likers (FK requires profiles.id).
 * @deprecated Prefer scheduling + createOrganicLikeNow.
 */
export async function runOrganicLikes(maxLikes = 20) {
  let created = 0;
  for (let i = 0; i < maxLikes; i++) {
    if (await createOrganicLikeNow()) created += 1;
  }
  return { likes: created };
}

export { pickRandom };
