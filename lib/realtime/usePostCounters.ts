"use client";

import { useCallback, useState } from "react";
import { usePostgresChanges } from "@/lib/realtime/usePostgresChanges";

/**
 * Keep like_count / reply_count / repost_count in sync via posts UPDATE.
 */
export function usePostCounters(
  postId: string,
  initial: { like_count: number; reply_count: number; repost_count: number }
) {
  const [likeCount, setLikeCount] = useState(initial.like_count);
  const [replyCount, setReplyCount] = useState(initial.reply_count);
  const [repostCount, setRepostCount] = useState(initial.repost_count);

  const handleUpdate = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const row = payload.new;
      if (row.id !== postId) return;
      if (typeof row.like_count === "number") setLikeCount(row.like_count);
      if (typeof row.reply_count === "number") setReplyCount(row.reply_count);
      if (typeof row.repost_count === "number") setRepostCount(row.repost_count);
    },
    [postId]
  );

  usePostgresChanges({
    channelName: `post-counters-${postId}`,
    table: "posts",
    event: "UPDATE",
    filter: `id=eq.${postId}`,
    onPayload: (payload) => {
      handleUpdate(payload as { new: Record<string, unknown> });
    },
  });

  return {
    likeCount,
    setLikeCount,
    replyCount,
    setReplyCount,
    repostCount,
    setRepostCount,
  };
}
