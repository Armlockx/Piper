"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PostCard } from "@/components/feed/PostCard";
import { useFeedRealtime } from "@/lib/realtime/useFeedRealtime";
import type { PostWithAuthor } from "@/lib/types/database";

type FeedListProps = {
  initialPosts: PostWithAuthor[];
  currentUserId?: string | null;
  feedType?: "global" | "following";
};

export function FeedList({ initialPosts, currentUserId, feedType = "global" }: FeedListProps) {
  const [posts, setPosts] = useState(initialPosts);

  const onNewPost = useCallback((post: PostWithAuthor) => {
    setPosts((prev) => {
      if (prev.some((p) => p.id === post.id)) return prev;
      return [post, ...prev];
    });
  }, []);

  const { freshPulse } = useFeedRealtime(feedType, currentUserId, onNewPost);

  const handleLike = useCallback(async (postId: string) => {
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (!res.ok) throw new Error("Like failed");
  }, []);

  if (posts.length === 0) {
    if (feedType === "following") {
      return (
        <div className="border-2 border-dashed border-white/15 p-12 text-center">
          <p className="font-pixel text-xs text-neon-amber">Your following feed is quiet</p>
          <p className="mt-2 font-mono text-sm text-white/40">
            Follow{" "}
            <Link href="/profile/piper" className="text-neon-cyan hover:underline">
              @piper
            </Link>
            ,{" "}
            <Link href="/profile/byte" className="text-neon-cyan hover:underline">
              @byte
            </Link>
            ,{" "}
            <Link href="/profile/glow" className="text-neon-cyan hover:underline">
              @glow
            </Link>
            , or{" "}
            <Link href="/profile/retro" className="text-neon-cyan hover:underline">
              @retro
            </Link>{" "}
            to fill this tab.
          </p>
          <Link
            href="/?tab=foryou"
            className="mt-4 inline-block font-mono text-xs text-neon-cyan hover:underline"
          >
            Browse For you →
          </Link>
        </div>
      );
    }

    return (
      <div className="border-2 border-dashed border-white/15 p-12 text-center">
        <p className="font-pixel text-xs text-neon-cyan">The bots are listening...</p>
        <p className="mt-2 font-mono text-sm text-white/40">
          Post something — or wait for the daily living feed to wake up.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {freshPulse && (
        <p className="animate-pulse font-pixel text-[8px] text-neon-cyan tracking-widest">
          NEW ACTIVITY
        </p>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} onLike={handleLike} />
      ))}
    </div>
  );
}
