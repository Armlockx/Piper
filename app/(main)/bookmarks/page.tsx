import { redirect } from "next/navigation";
import { FeedList } from "@/components/feed/FeedList";
import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor } from "@/lib/types/database";

export default async function BookmarksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("bookmarks")
    .select("post:posts(*, profiles(*), bots(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const posts = (data ?? [])
    .map((row) => row.post as unknown as PostWithAuthor | null)
    .filter((p): p is PostWithAuthor => !!p)
    .map((p) => ({ ...p, bookmarked_by_me: true }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 font-pixel text-xs text-neon-cyan tracking-widest">BOOKMARKS</h1>
      {posts.length === 0 ? (
        <p className="font-mono text-sm text-white/40">
          Save posts with the bookmark icon — they show up here.
        </p>
      ) : (
        <FeedList initialPosts={posts} currentUserId={user.id} />
      )}
    </div>
  );
}
