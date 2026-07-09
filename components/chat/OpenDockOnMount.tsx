"use client";

import { openChatDock } from "@/components/chat/ChatMiniDock";

export function OpenDockButton({ conversationId }: { conversationId: string }) {
  return (
    <button
      type="button"
      onClick={() => openChatDock(conversationId)}
      className="font-mono text-xs text-neon-cyan hover:underline"
    >
      Mini window
    </button>
  );
}
