"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePostgresChanges } from "@/lib/realtime/usePostgresChanges";
import type { Notification } from "@/lib/types/database";

export function useNotificationCount(userId: string | null | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
      .then(({ count: c }) => {
        if (!cancelled) setCount(c ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  usePostgresChanges({
    channelName: `notif-count-${userId ?? "anon"}`,
    table: "notifications",
    event: "INSERT",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: Boolean(userId),
    onPayload: () => setCount((c) => c + 1),
  });

  const markAllRead = useCallback(() => setCount(0), []);
  const decrement = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  return { count: userId ? count : 0, markAllRead, decrement, setCount };
}

export function useNotificationList(
  userId: string | null | undefined,
  initial: Notification[],
  onNew?: (n: Notification) => void
) {
  const [items, setItems] = useState(initial);
  const [seed, setSeed] = useState(initial);

  // Reset when server-provided list identity changes (navigation)
  if (initial !== seed) {
    setSeed(initial);
    setItems(initial);
  }

  const handleInsert = useCallback(
    async (payload: { new: Record<string, unknown> }) => {
      const id = payload.new.id as string | undefined;
      if (!id) return;

      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("*, actor:profiles!notifications_actor_id_fkey(*), bot:bots(*), post:posts(*)")
        .eq("id", id)
        .single();

      if (!data) return;
      const n = data as Notification;
      setItems((prev) => {
        if (prev.some((x) => x.id === n.id)) return prev;
        return [n, ...prev];
      });
      onNew?.(n);
    },
    [onNew]
  );

  usePostgresChanges({
    channelName: `notif-list-${userId ?? "anon"}`,
    table: "notifications",
    event: "INSERT",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: Boolean(userId),
    onPayload: (payload) => {
      void handleInsert(payload as { new: Record<string, unknown> });
    },
  });

  return { items, setItems };
}
