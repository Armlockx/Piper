"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "@/components/feed/PostCard";
import type { PostWithAuthor } from "@/lib/types/database";

type FeedListProps = {
  initialPosts: PostWithAuthor[];
  currentUserId?: string | null;
  feedType?: "global" | "following";
};

export function FeedList({ initialPosts, currentUserId, feedType = "global" }: FeedListProps) {
  const [posts, setPosts] = useState(initialPosts);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`feed-${feedType}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const { data } = await supabase
            .from("posts")
            .select("*, profiles(*), bots(*)")
            .eq("id", payload.new.id as string)
            .single();
          if (data && !data.parent_post_id) {
            setPosts((prev) => {
              if (prev.some((p) => p.id === data.id)) return prev;
              return [{ ...data, liked_by_me: false } as PostWithAuthor, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [feedType]);

  const handleLike = useCallback(async (postId: string) => {
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (!res.ok) throw new Error("Like failed");
  }, []);

  if (posts.length === 0) {
    return (
      <div className="border-2 border-dashed border-white/15 p-12 text-center">
        <p className="font-pixel text-xs text-neon-cyan">The bots are listening...</p>
        <p className="mt-2 font-mono text-sm text-white/40">Post something to start the feed.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} onLike={handleLike} />
      ))}
    </div>
  );
}
