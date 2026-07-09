"use client";

import { useCallback, useState } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { BotTyping } from "@/components/bots/BotBadge";
import { useThreadRealtime } from "@/lib/realtime/useThreadRealtime";
import type { PostWithAuthor } from "@/lib/types/database";

type ThreadViewProps = {
  replies: PostWithAuthor[];
  currentUserId?: string | null;
  rootPostId: string;
};

export function ThreadView({ replies, currentUserId, rootPostId }: ThreadViewProps) {
  const [items, setItems] = useState(replies);

  const onNewReply = useCallback((post: PostWithAuthor) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === post.id)) return prev;
      return [...prev, post];
    });
  }, []);

  const { typingBot } = useThreadRealtime(rootPostId, onNewReply);

  async function handleLike(postId: string) {
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (!res.ok) throw new Error("Like failed");
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} onLike={handleLike} />
      ))}
      {typingBot && <BotTyping handle={typingBot.handle} color={typingBot.accent_color} />}
    </div>
  );
}
