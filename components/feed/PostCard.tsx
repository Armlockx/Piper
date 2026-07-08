"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { BotBadge } from "@/components/bots/BotBadge";
import { PostContent } from "@/components/feed/PostContent";
import { VerifiedBadge } from "@/components/profile/VerifiedBadge";
import { formatRelativeTime } from "@/lib/utils";
import type { PostWithAuthor } from "@/lib/types/database";

type PostCardProps = {
  post: PostWithAuthor;
  currentUserId?: string | null;
  onLike?: (postId: string) => Promise<void>;
  showReply?: boolean;
};

export function PostCard({ post, currentUserId, onLike, showReply = true }: PostCardProps) {
  const [liked, setLiked] = useState(post.liked_by_me ?? false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [liking, setLiking] = useState(false);
  const [burst, setBurst] = useState(false);

  const isBot = post.author_type === "bot";
  const handle = isBot ? post.bots?.handle : post.profiles?.handle;
  const displayName = isBot ? post.bots?.name : post.profiles?.display_name;
  const avatar = isBot ? post.bots?.avatar_url : post.profiles?.avatar_url;
  const accent = isBot ? post.bots?.accent_color : undefined;
  const profileHref = isBot ? `/profile/${handle}` : `/profile/${handle}`;

  async function toggleLike() {
    if (!currentUserId || !onLike || liking) return;
    setLiking(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (next) setBurst(true);
    try {
      await onLike(post.id);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    } finally {
      setLiking(false);
      setTimeout(() => setBurst(false), 400);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-white/10 bg-black/30 p-4 hover:border-white/20 transition-colors"
    >
      <div className="flex gap-3">
        <Link href={profileHref}>
          <Avatar src={avatar} alt={displayName ?? "?"} accent={accent} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={profileHref} className="font-mono text-sm font-bold hover:text-neon-cyan">
              {displayName}
            </Link>
            <span className="font-mono text-xs text-white/40">@{handle}</span>
            {isBot && post.bots && <BotBadge handle={post.bots.handle} color={post.bots.accent_color} />}
            {!isBot && post.profiles?.email_verified_at && <VerifiedBadge />}
            <span className="font-mono text-xs text-white/30">· {formatRelativeTime(post.created_at)}</span>
          </div>
          <div className="mt-2">
            <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
              <PostContent content={post.content} />
            </p>
          </div>
          <div className="mt-3 flex items-center gap-6">
            {showReply && (
              <Link
                href={`/post/${post.root_post_id ?? post.id}`}
                className="flex items-center gap-1.5 font-mono text-xs text-white/40 hover:text-neon-cyan"
              >
                <MessageCircle size={14} />
                {post.reply_count || ""}
              </Link>
            )}
            <button
              type="button"
              onClick={toggleLike}
              disabled={!currentUserId || liking}
              className="relative flex items-center gap-1.5 font-mono text-xs text-white/40 hover:text-neon-magenta disabled:cursor-default"
            >
              <Heart size={14} className={liked ? "fill-neon-magenta text-neon-magenta" : ""} />
              {likeCount || ""}
              {burst && (
                <motion.span
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  className="pointer-events-none absolute -left-1 -top-1 h-6 w-6 rounded-full border border-neon-magenta"
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
