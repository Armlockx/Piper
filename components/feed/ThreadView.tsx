"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "@/components/feed/PostCard";
import { BotTyping } from "@/components/bots/BotBadge";
import type { Bot, PostWithAuthor } from "@/lib/types/database";

type ThreadViewProps = {
  replies: PostWithAuthor[];
  currentUserId?: string | null;
  rootPostId: string;
};

export function ThreadView({ replies, currentUserId, rootPostId }: ThreadViewProps) {
  const [items, setItems] = useState(replies);
  const [typingBot, setTypingBot] = useState<Bot | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const postsChannel = supabase
      .channel(`thread-${rootPostId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts", filter: `root_post_id=eq.${rootPostId}` },
        async (payload) => {
          const { data } = await supabase
            .from("posts")
            .select("*, profiles(*), bots(*)")
            .eq("id", payload.new.id as string)
            .single();
          if (data && data.parent_post_id) {
            setTypingBot(null);
            setItems((prev) => {
              if (prev.some((p) => p.id === data.id)) return prev;
              return [...prev, { ...data, liked_by_me: false } as PostWithAuthor];
            });
          }
        }
      )
      .subscribe();

    const jobsChannel = supabase
      .channel(`jobs-${rootPostId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bot_reply_jobs" },
        async (payload) => {
          const job = payload.new as { bot_id: string; status: string };
          if (job.status === "pending" || job.status === "processing") {
            const { data: bot } = await supabase.from("bots").select("*").eq("id", job.bot_id).single();
            if (bot) setTypingBot(bot);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(jobsChannel);
    };
  }, [rootPostId]);

  async function handleLike(postId: string) {
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (!res.ok) throw new Error("Like failed");
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} onLike={handleLike} />
      ))}
      {typingBot && <BotTyping handle={typingBot.handle} color={typingBot.accent_color} />}
    </div>
  );
}
