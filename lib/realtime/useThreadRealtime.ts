"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePostgresChanges } from "@/lib/realtime/usePostgresChanges";
import type { PostWithAuthor } from "@/lib/types/database";

export function useThreadRealtime(
  rootPostId: string,
  onNewReply: (post: PostWithAuthor) => void
) {
  const handlePostInsert = useCallback(
    async (payload: { new: Record<string, unknown> }) => {
      const id = payload.new.id as string | undefined;
      if (!id) return;

      const supabase = createClient();
      const { data } = await supabase
        .from("posts")
        .select("*, profiles(*), bots(*)")
        .eq("id", id)
        .single();

      if (data && data.parent_post_id) {
        onNewReply({ ...data, liked_by_me: false } as PostWithAuthor);
      }
    },
    [onNewReply]
  );

  usePostgresChanges({
    channelName: `thread-${rootPostId}`,
    table: "posts",
    event: "INSERT",
    filter: `root_post_id=eq.${rootPostId}`,
    onPayload: (payload) => {
      void handlePostInsert(payload as { new: Record<string, unknown> });
    },
  });
}
