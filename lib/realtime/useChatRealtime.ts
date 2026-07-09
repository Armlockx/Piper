"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePostgresChanges } from "@/lib/realtime/usePostgresChanges";
import type { Bot, ChatMessage } from "@/lib/types/database";

export function useChatRealtime(
  conversationId: string,
  onNewMessage: (msg: ChatMessage) => void
) {
  const [typingBot, setTypingBot] = useState<Bot | null>(null);

  const handleMessage = useCallback(
    async (payload: { new: Record<string, unknown> }) => {
      const id = payload.new.id as string | undefined;
      if (!id) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("chat_messages")
        .select("*, profiles:sender_user_id(*), bots:sender_bot_id(*)")
        .eq("id", id)
        .single();
      if (data) {
        if (data.sender_type === "bot") setTypingBot(null);
        onNewMessage(data as ChatMessage);
      }
    },
    [onNewMessage]
  );

  const handleJob = useCallback(
    async (payload: { new: Record<string, unknown> }) => {
      const job = payload.new as {
        conversation_id?: string;
        bot_id?: string;
        status?: string;
      };
      if (job.conversation_id !== conversationId) return;
      if (job.status === "pending" || job.status === "processing") {
        if (!job.bot_id) return;
        const supabase = createClient();
        const { data: bot } = await supabase.from("bots").select("*").eq("id", job.bot_id).single();
        if (bot) setTypingBot(bot);
      }
    },
    [conversationId]
  );

  usePostgresChanges({
    channelName: `chat-msgs-${conversationId}`,
    table: "chat_messages",
    event: "INSERT",
    filter: `conversation_id=eq.${conversationId}`,
    onPayload: (payload) => {
      void handleMessage(payload as { new: Record<string, unknown> });
    },
  });

  usePostgresChanges({
    channelName: `chat-jobs-${conversationId}`,
    table: "chat_reply_jobs",
    event: "INSERT",
    filter: `conversation_id=eq.${conversationId}`,
    onPayload: (payload) => {
      void handleJob(payload as { new: Record<string, unknown> });
    },
  });

  return { typingBot };
}
