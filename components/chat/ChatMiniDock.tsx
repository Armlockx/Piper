"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, X } from "lucide-react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import type { Bot, BotConversationState, ChatMessage, Conversation } from "@/lib/types/database";

const STORAGE_KEY = "piper-chat-dock";

type DockState = {
  conversationId: string;
  collapsed: boolean;
} | null;

type Loaded = {
  conversation: Conversation & { bots: Bot };
  messages: ChatMessage[];
  state: BotConversationState | null;
};

function readDockFromStorage(): DockState {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DockState;
  } catch {
    /* ignore */
  }
  return null;
}

export function ChatMiniDock() {
  const router = useRouter();
  const [dock, setDock] = useState<DockState>(readDockFromStorage);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ conversationId: string }>).detail;
      if (!detail?.conversationId) return;
      const next = { conversationId: detail.conversationId, collapsed: false };
      setDock(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }

    window.addEventListener("piper:open-chat-dock", onOpen);
    return () => window.removeEventListener("piper:open-chat-dock", onOpen);
  }, []);

  const load = useCallback(async (conversationId: string) => {
    const [convRes, msgRes] = await Promise.all([
      fetch("/api/chat/conversations"),
      fetch(`/api/chat/messages?conversationId=${conversationId}`),
    ]);
    const convData = await convRes.json();
    const msgData = await msgRes.json();
    const conversation = (convData.conversations as (Conversation & { bots: Bot })[] | undefined)?.find(
      (c) => c.id === conversationId
    );
    if (!conversation?.bots) {
      setLoaded(null);
      return;
    }

    const stateRes = await fetch(`/api/chat/state?conversationId=${conversationId}`);
    const stateData = stateRes.ok ? await stateRes.json() : { state: null };

    setLoaded({
      conversation,
      messages: (msgData.messages as ChatMessage[]) ?? [],
      state: stateData.state ?? null,
    });
  }, []);

  useEffect(() => {
    if (!dock?.conversationId) return;
    let cancelled = false;
    void (async () => {
      await load(dock.conversationId);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [dock?.conversationId, load]);

  function persist(next: DockState) {
    setDock(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else {
      localStorage.removeItem(STORAGE_KEY);
      setLoaded(null);
    }
  }

  if (!dock) return null;

  const ready = loaded && loaded.conversation.id === dock.conversationId;

  if (!ready) {
    return (
      <div className="fixed bottom-20 right-4 z-[60] border-2 border-white/20 bg-black px-3 py-2 font-mono text-xs text-white/40 md:bottom-4">
        Loading chat...
      </div>
    );
  }

  const bot = loaded.conversation.bots;

  if (dock.collapsed) {
    return (
      <button
        type="button"
        onClick={() => persist({ ...dock, collapsed: false })}
        className="fixed bottom-20 right-4 z-[60] flex items-center gap-2 border-2 border-neon-cyan/50 bg-black px-3 py-2 font-mono text-xs text-neon-cyan shadow-lg md:bottom-4"
        style={{ borderColor: bot.accent_color }}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: bot.accent_color }} />
        Chat @{bot.handle}
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-[60] flex h-[420px] w-[340px] max-w-[calc(100vw-2rem)] flex-col shadow-2xl md:bottom-4">
      <div className="flex items-center justify-end gap-1 border-2 border-b-0 border-white/15 bg-black/80 px-2 py-1">
        <button
          type="button"
          aria-label="Collapse"
          onClick={() => persist({ ...dock, collapsed: true })}
          className="p-1 text-white/40 hover:text-white"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={() => persist(null)}
          className="p-1 text-white/40 hover:text-red-400"
        >
          <X size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <ChatWindow
          key={dock.conversationId}
          conversationId={dock.conversationId}
          bot={bot}
          initialMessages={loaded.messages}
          moodState={loaded.state}
          compact
          onOpenFull={() => {
            router.push(`/messages/${dock.conversationId}`);
            persist({ ...dock, collapsed: true });
          }}
        />
      </div>
    </div>
  );
}

/** Open the floating chat dock for a conversation. */
export function openChatDock(conversationId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("piper:open-chat-dock", { detail: { conversationId } })
  );
}
