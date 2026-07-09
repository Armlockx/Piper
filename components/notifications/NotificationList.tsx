"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useUnreadNotificationCount } from "@/components/layout/NotificationCountProvider";
import { useNotificationList } from "@/lib/realtime/useNotificationRealtime";
import { formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@/lib/types/database";

export function NotificationList({
  initial,
  userId,
}: {
  initial: Notification[];
  userId?: string | null;
}) {
  const { items } = useNotificationList(userId, initial);
  const { markAllRead } = useUnreadNotificationCount();

  useEffect(() => {
    void fetch("/api/notifications", { method: "PATCH" }).then(() => markAllRead());
  }, [markAllRead]);

  function label(n: Notification) {
    const actor = n.actor?.display_name ?? n.bot?.name ?? "Someone";
    switch (n.type) {
      case "like":
        return `${actor} liked your post`;
      case "reply":
        return `${actor} replied to you`;
      case "follow":
        return `${actor} followed you`;
      case "bot_reply":
        return `@${n.bot?.handle ?? "bot"} replied to you`;
      default:
        return "New activity";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && (
        <p className="font-mono text-sm text-white/40 py-8 text-center">All quiet. Post something!</p>
      )}
      {items.map((n) => (
        <Link
          key={n.id}
          href={n.post_id ? `/post/${n.post_id}` : n.actor ? `/profile/${n.actor.handle}` : "#"}
          className={`block border-2 p-4 font-mono text-sm transition-colors hover:border-neon-cyan/30 ${
            n.read ? "border-white/10 bg-black/20" : "border-neon-cyan/20 bg-neon-cyan/5"
          }`}
        >
          <p>{label(n)}</p>
          <p className="mt-1 text-xs text-white/30">{formatRelativeTime(n.created_at)}</p>
        </Link>
      ))}
    </div>
  );
}
