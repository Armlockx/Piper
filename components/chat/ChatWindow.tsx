"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { BotTyping } from "@/components/bots/BotBadge";
import { BotMoodBadge } from "@/components/chat/BotMoodBadge";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { useChatRealtime } from "@/lib/realtime/useChatRealtime";
import { formatRelativeTime } from "@/lib/utils";
import type { Bot, BotConversationState, ChatMessage } from "@/lib/types/database";

type ChatWindowProps = {
  conversationId: string;
  bot: Bot;
  initialMessages: ChatMessage[];
  moodState?: BotConversationState | null;
  compact?: boolean;
  onOpenFull?: () => void;
};

export function ChatWindow({
  conversationId,
  bot,
  initialMessages,
  moodState,
  compact,
  onOpenFull,
}: ChatWindowProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [seedId, setSeedId] = useState(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  if (conversationId !== seedId) {
    setSeedId(conversationId);
    setMessages(initialMessages);
  }

  const onNewMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const { typingBot } = useChatRealtime(conversationId, onNewMessage);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingBot]);

  async function send(content: string) {
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to send");
    if (data.message) {
      onNewMessage(data.message as ChatMessage);
    }
  }

  return (
    <div className={`flex flex-col ${compact ? "h-full" : "h-[min(70vh,640px)]"} border-2 border-white/10 bg-black/50`}>
      <header className="flex items-center gap-3 border-b-2 border-white/10 px-3 py-2">
        <Avatar src={bot.avatar_url} alt={bot.name} accent={bot.accent_color} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-bold">{bot.name}</p>
          <p className="font-mono text-[10px] text-white/40">@{bot.handle}</p>
        </div>
        {moodState && <BotMoodBadge mood={moodState.mood} intensity={moodState.mood_intensity} />}
        {onOpenFull && (
          <button
            type="button"
            onClick={onOpenFull}
            className="font-mono text-[10px] text-neon-cyan hover:underline"
          >
            Expand
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="py-8 text-center font-mono text-xs text-white/35">
            Say hi to @{bot.handle} — they remember the vibe.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_type === "user";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] border-2 px-3 py-2 font-mono text-sm ${
                  mine
                    ? "border-neon-cyan/40 bg-neon-cyan/10 text-white"
                    : "border-white/15 bg-black/40"
                }`}
                style={!mine ? { borderColor: `${bot.accent_color}55` } : undefined}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                <p className="mt-1 text-[10px] text-white/30">{formatRelativeTime(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        {typingBot && <BotTyping handle={typingBot.handle} color={typingBot.accent_color} />}
        <div ref={bottomRef} />
      </div>

      <ChatComposer onSend={send} compact={compact} placeholder={`Message @${bot.handle}...`} />
    </div>
  );
}
