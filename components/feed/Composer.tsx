"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MAX_POST_LENGTH } from "@/lib/bots/constants";
import type { Bot } from "@/lib/types/database";

type ComposerProps = {
  bots?: Bot[];
  parentPostId?: string;
  rootPostId?: string;
  placeholder?: string;
  onSuccess?: () => void;
};

export function Composer({
  bots = [],
  parentPostId,
  rootPostId,
  placeholder = "What's happening?",
  onSuccess,
}: ComposerProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const router = useRouter();

  const remaining = MAX_POST_LENGTH - content.length;
  const mentionQuery = content.match(/@([a-zA-Z0-9_]*)$/)?.[1]?.toLowerCase() ?? "";
  const filteredBots = bots.filter((b) => b.handle.toLowerCase().startsWith(mentionQuery));

  function insertMention(handle: string) {
    setContent((c) => c.replace(/@([a-zA-Z0-9_]*)$/, `@${handle} `));
    setShowMentions(false);
  }

  async function submit() {
    if (!content.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), parentPostId, rootPostId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post");

      setContent("");
      onSuccess?.();
      // Thread replies still need a soft refresh so the root reply_count SSR stays in sync;
      // top-level posts land via FeedList Realtime without a full refresh.
      if (parentPostId) {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative border-2 border-white/15 bg-black/40 p-4">
      <Textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setShowMentions(/@[a-zA-Z0-9_]*$/.test(e.target.value));
        }}
        placeholder={placeholder}
        rows={3}
        maxLength={MAX_POST_LENGTH}
      />
      {showMentions && filteredBots.length > 0 && (
        <div className="absolute left-4 right-4 top-full z-10 mt-1 border-2 border-neon-cyan/30 bg-black">
          {filteredBots.map((bot) => (
            <button
              key={bot.id}
              type="button"
              onClick={() => insertMention(bot.handle)}
              className="block w-full px-3 py-2 text-left font-mono text-sm hover:bg-neon-cyan/10"
              style={{ color: bot.accent_color }}
            >
              @{bot.handle} — {bot.name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className={`font-mono text-xs ${remaining < 20 ? "text-neon-amber" : "text-white/30"}`}>
          {remaining}
        </span>
        {error && <span className="font-mono text-xs text-red-400">{error}</span>}
        <Button onClick={submit} disabled={loading || !content.trim()} size="sm">
          {loading ? "Posting..." : parentPostId ? "Reply" : "Post"}
        </Button>
      </div>
    </div>
  );
}
