"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePostgresChanges } from "@/lib/realtime/usePostgresChanges";
import type { PostWithAuthor } from "@/lib/types/database";

type FeedType = "global" | "following";

export function useFeedRealtime(
  feedType: FeedType,
  currentUserId: string | null | undefined,
  onNewPost: (post: PostWithAuthor) => void
) {
  const [freshPulse, setFreshPulse] = useState(false);

  const handleInsert = useCallback(
    async (payload: { new: Record<string, unknown> }) => {
      const id = payload.new.id as string | undefined;
      if (!id) return;

      const supabase = createClient();
      const { data } = await supabase
        .from("posts")
        .select("*, profiles(*), bots(*)")
        .eq("id", id)
        .single();

      if (!data || data.parent_post_id) return;

      if (feedType === "following" && currentUserId) {
        const authorId = data.author_id as string | null;
        const botId = data.bot_id as string | null;

        if (data.author_type === "user" && authorId) {
          if (authorId === currentUserId) {
            // own posts always show
          } else {
            const { data: follow } = await supabase
              .from("follows")
              .select("id")
              .eq("follower_id", currentUserId)
              .eq("following_id", authorId)
              .maybeSingle();
            if (!follow) return;
          }
        } else if (data.author_type === "bot" && botId) {
          const { data: botFollow } = await supabase
            .from("bot_follows")
            .select("id")
            .eq("follower_id", currentUserId)
            .eq("bot_id", botId)
            .maybeSingle();
          if (!botFollow) return;
        } else {
          return;
        }
      }

      onNewPost({ ...data, liked_by_me: false } as PostWithAuthor);
      setFreshPulse(true);
      setTimeout(() => setFreshPulse(false), 2000);
    },
    [feedType, currentUserId, onNewPost]
  );

  usePostgresChanges({
    channelName: `feed-${feedType}-${currentUserId ?? "anon"}`,
    table: "posts",
    event: "INSERT",
    onPayload: (payload) => {
      void handleInsert(payload as { new: Record<string, unknown> });
    },
  });

  return { freshPulse };
}
