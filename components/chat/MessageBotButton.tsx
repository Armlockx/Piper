"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { openChatDock } from "@/components/chat/ChatMiniDock";
import { Button } from "@/components/ui/button";

export function MessageBotButton({
  botHandle,
  openDock = true,
}: {
  botHandle: string;
  openDock?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function startChat() {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botHandle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const id = data.conversation?.id as string;
      if (openDock) openChatDock(id);
      router.push(`/messages/${id}`);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void startChat()}
      disabled={loading}
      className="gap-1.5"
    >
      <MessageCircle size={14} />
      {loading ? "..." : "Message"}
    </Button>
  );
}
