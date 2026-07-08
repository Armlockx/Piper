import { notFound } from "next/navigation";
import { Composer } from "@/components/feed/Composer";
import { PostCard } from "@/components/feed/PostCard";
import { ThreadView } from "@/components/feed/ThreadView";
import { getBots, getThread } from "@/lib/posts/queries";
import { createClient } from "@/lib/supabase/server";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const posts = await getThread(id);

  if (posts.length === 0) notFound();

  const root = posts[0];
  const replies = posts.slice(1);
  const bots = await getBots();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 font-pixel text-xs text-neon-cyan tracking-widest">THREAD</h1>
      <PostCard post={root} currentUserId={user?.id} showReply={false} />
      <div className="my-4">
        <Composer
          bots={bots ?? []}
          parentPostId={root.id}
          rootPostId={root.root_post_id ?? root.id}
          placeholder={`Reply to @${root.profiles?.handle ?? root.bots?.handle}...`}
        />
      </div>
      <ThreadView
        key={replies.map((r) => r.id).join("-") || root.id}
        replies={replies}
        currentUserId={user?.id}
        rootPostId={root.root_post_id ?? root.id}
      />
    </div>
  );
}
