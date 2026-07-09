"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatComposerProps = {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
};

export function ChatComposer({
  onSend,
  disabled,
  placeholder = "Say something...",
  compact,
}: ChatComposerProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!content.trim() || loading || disabled) return;
    setLoading(true);
    setError(null);
    try {
      await onSend(content.trim());
      setContent("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={compact ? "p-2" : "border-t-2 border-white/10 p-3"}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        maxLength={4000}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <div className="mt-2 flex items-center justify-between">
        {error ? (
          <span className="font-mono text-xs text-red-400">{error}</span>
        ) : (
          <span className="font-mono text-[10px] text-white/25">Enter to send · Shift+Enter newline</span>
        )}
        <Button onClick={() => void submit()} disabled={loading || !content.trim() || disabled} size="sm">
          {loading ? "..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
