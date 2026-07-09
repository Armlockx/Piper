"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePostgresChanges } from "@/lib/realtime/usePostgresChanges";

type NotificationCountContextValue = {
  count: number;
  markAllRead: () => void;
};

const NotificationCountContext = createContext<NotificationCountContextValue>({
  count: 0,
  markAllRead: () => {},
});

export function NotificationCountProvider({
  userId,
  initialCount = 0,
  children,
}: {
  userId?: string | null;
  initialCount?: number;
  children: ReactNode;
}) {
  const [count, setCount] = useState(initialCount);

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

  return (
    <NotificationCountContext.Provider
      value={{
        count: userId ? count : 0,
        markAllRead: () => setCount(0),
      }}
    >
      {children}
    </NotificationCountContext.Provider>
  );
}

export function useUnreadNotificationCount() {
  return useContext(NotificationCountContext);
}
