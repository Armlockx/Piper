"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePostgresChanges } from "@/lib/realtime/usePostgresChanges";
import { isRecentFailedJob } from "@/lib/bots/replyJob";
import type { Bot } from "@/lib/types/database";

type JobRow = {
  bot_id?: string;
  status?: string;
  processed_at?: string | null;
  root_post_id?: string | null;
};

export function useThreadJobStatus(rootPostId: string) {
  const [typingBot, setTypingBot] = useState<Bot | null>(null);
  const [failedBot, setFailedBot] = useState<Bot | null>(null);

  const handleJob = useCallback(
    async (payload: { new: Record<string, unknown> }) => {
      const job = payload.new as JobRow;
      if (job.root_post_id && job.root_post_id !== rootPostId) return;

      if (job.status === "pending" || job.status === "processing") {
        if (!job.bot_id) return;
        const supabase = createClient();
        const { data: bot } = await supabase.from("bots").select("*").eq("id", job.bot_id).single();
        if (bot) {
          setTypingBot(bot);
          setFailedBot(null);
        }
        return;
      }

      if (job.status === "done") {
        setTypingBot(null);
        setFailedBot(null);
        return;
      }

      if (job.status === "failed") {
        setTypingBot(null);
        if (!isRecentFailedJob(job.status, job.processed_at ?? null) || !job.bot_id) {
          setFailedBot(null);
          return;
        }
        const supabase = createClient();
        const { data: bot } = await supabase.from("bots").select("*").eq("id", job.bot_id).single();
        setFailedBot(bot ?? null);
      }
    },
    [rootPostId]
  );

  usePostgresChanges({
    channelName: `jobs-status-${rootPostId}`,
    table: "bot_reply_jobs",
    event: "*",
    filter: `root_post_id=eq.${rootPostId}`,
    onPayload: (payload) => {
      void handleJob(payload as { new: Record<string, unknown> });
    },
  });

  const clearTyping = useCallback(() => setTypingBot(null), []);

  return { typingBot, failedBot, clearTyping };
}
