"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePostgresChanges } from "@/lib/realtime/usePostgresChanges";
import type { Bot, PostWithAuthor } from "@/lib/types/database";

export function useThreadRealtime(
  rootPostId: string,
  onNewReply: (post: PostWithAuthor) => void
) {
  const [typingBot, setTypingBot] = useState<Bot | null>(null);

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
        setTypingBot(null);
        onNewReply({ ...data, liked_by_me: false } as PostWithAuthor);
      }
    },
    [onNewReply]
  );

  const handleJobInsert = useCallback(
    async (payload: { new: Record<string, unknown> }) => {
      const job = payload.new as {
        bot_id?: string;
        status?: string;
        root_post_id?: string | null;
        post_id?: string;
      };

      if (job.root_post_id && job.root_post_id !== rootPostId) return;

      // Fallback when root_post_id not yet backfilled
      if (!job.root_post_id && job.post_id) {
        const supabase = createClient();
        const { data: post } = await supabase
          .from("posts")
          .select("id, root_post_id")
          .eq("id", job.post_id)
          .single();
        const root = post?.root_post_id ?? post?.id;
        if (root !== rootPostId) return;
      }

      if (job.status === "pending" || job.status === "processing") {
        if (!job.bot_id) return;
        const supabase = createClient();
        const { data: bot } = await supabase.from("bots").select("*").eq("id", job.bot_id).single();
        if (bot) setTypingBot(bot);
      }
    },
    [rootPostId]
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

  usePostgresChanges({
    channelName: `jobs-${rootPostId}`,
    table: "bot_reply_jobs",
    event: "INSERT",
    filter: `root_post_id=eq.${rootPostId}`,
    onPayload: (payload) => {
      void handleJobInsert(payload as { new: Record<string, unknown> });
    },
  });

  // Also listen without filter for jobs that may lack root_post_id (pre-migration)
  usePostgresChanges({
    channelName: `jobs-fallback-${rootPostId}`,
    table: "bot_reply_jobs",
    event: "INSERT",
    enabled: true,
    onPayload: (payload) => {
      const job = payload.new as { root_post_id?: string | null };
      // Only handle via fallback when root_post_id is null
      if (job.root_post_id) return;
      void handleJobInsert(payload as { new: Record<string, unknown> });
    },
  });

  return { typingBot, clearTyping: () => setTypingBot(null) };
}
