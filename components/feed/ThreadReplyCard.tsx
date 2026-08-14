"use client";

import { useTranslations } from "next-intl";
import { PostCard } from "@/components/feed/PostCard";
import type { PostWithAuthor, ReplySource } from "@/lib/types/database";

type ThreadReplyCardProps = {
  post: PostWithAuthor;
  depth: number;
  parentHandle: string | null;
  deep: boolean;
  currentUserId?: string | null;
  onLike?: (postId: string) => Promise<void>;
};

const SOURCE_KEY: Record<Exclude<ReplySource, "user">, "sourceMention" | "sourceAuto" | "sourceCron"> = {
  bot_mention: "sourceMention",
  bot_auto: "sourceAuto",
  bot_cron: "sourceCron",
};

export function ThreadReplyCard({
  post,
  depth,
  parentHandle,
  deep,
  currentUserId,
  onLike,
}: ThreadReplyCardProps) {
  const t = useTranslations("Feed");
  const source = post.reply_source;
  const sourceLabel =
    post.author_type === "bot" && source && source !== "user" ? t(SOURCE_KEY[source]) : null;

  return (
    <div
      id={`reply-${post.id}`}
      className="scroll-mt-24"
      style={{ marginLeft: `${depth * 1.25}rem` }}
    >
      <div className={`border-l-2 pl-3 ${depth > 0 ? "border-white/15" : "border-transparent"}`}>
        <div className="mb-1 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
          {parentHandle && <span>{t("replyingTo", { handle: parentHandle })}</span>}
          {deep && <span className="text-neon-amber/80">{t("deepReply")}</span>}
          {sourceLabel && (
            <span className="border border-white/15 px-1 py-0.5 text-white/35">{sourceLabel}</span>
          )}
        </div>
        <PostCard post={post} currentUserId={currentUserId} onLike={onLike} />
      </div>
    </div>
  );
}
