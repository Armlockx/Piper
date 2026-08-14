"use client";

import { useCallback, useMemo, useState } from "react";
import { BotTyping } from "@/components/bots/BotBadge";
import { ThreadReplyCard } from "@/components/feed/ThreadReplyCard";
import { buildThreadTree, flattenThreadTree } from "@/lib/posts/buildThreadTree";
import { useThreadJobStatus } from "@/lib/realtime/useThreadJobStatus";
import { useThreadRealtime } from "@/lib/realtime/useThreadRealtime";
import { useTranslations } from "next-intl";
import type { PostWithAuthor } from "@/lib/types/database";

type ThreadViewProps = {
  root: PostWithAuthor;
  replies: PostWithAuthor[];
  currentUserId?: string | null;
  rootPostId: string;
};

export function ThreadView({ root, replies, currentUserId, rootPostId }: ThreadViewProps) {
  const t = useTranslations("Feed");
  const [items, setItems] = useState(replies);
  const { typingBot, failedBot, clearTyping } = useThreadJobStatus(rootPostId);

  const onNewReply = useCallback((post: PostWithAuthor) => {
    clearTyping();
    setItems((prev) => {
      if (prev.some((p) => p.id === post.id)) return prev;
      return [...prev, post];
    });
  }, [clearTyping]);

  useThreadRealtime(rootPostId, onNewReply);

  const nodes = useMemo(
    () => flattenThreadTree(buildThreadTree([root, ...items])),
    [root, items]
  );

  async function handleLike(postId: string) {
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (!res.ok) throw new Error("Like failed");
  }

  return (
    <div className="flex flex-col gap-3">
      {nodes.map((node) => (
        <ThreadReplyCard
          key={node.post.id}
          post={node.post}
          depth={node.depth}
          parentHandle={node.parentHandle}
          deep={node.deep}
          currentUserId={currentUserId}
          onLike={handleLike}
        />
      ))}
      {failedBot && (
        <p className="border-2 border-dashed border-neon-amber/40 px-4 py-3 font-mono text-xs text-neon-amber">
          {t("botReplyFailed", { handle: failedBot.handle })}
        </p>
      )}
      {typingBot && <BotTyping handle={typingBot.handle} color={typingBot.accent_color} />}
    </div>
  );
}
