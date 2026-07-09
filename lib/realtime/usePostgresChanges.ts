"use client";

import { useEffect, useId, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

type UsePostgresChangesOptions<T extends Record<string, unknown>> = {
  channelName: string;
  table: string;
  event?: PostgresEvent;
  filter?: string;
  schema?: string;
  enabled?: boolean;
  onPayload: (payload: RealtimePostgresChangesPayload<T>) => void;
};

/**
 * Shared Supabase Realtime postgres_changes subscription with cleanup.
 * Channel names are uniquified per hook instance so Sidebar + MobileNav
 * (or React Strict Mode remounts) never collide on the same topic.
 */
export function usePostgresChanges<T extends Record<string, unknown>>({
  channelName,
  table,
  event = "*",
  filter,
  schema = "public",
  enabled = true,
  onPayload,
}: UsePostgresChangesOptions<T>) {
  const instanceId = useId().replace(/:/g, "");
  const onPayloadRef = useRef(onPayload);

  useEffect(() => {
    onPayloadRef.current = onPayload;
  }, [onPayload]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    // Unique topic per hook instance — supabase.channel(name) reuses an
    // already-subscribed channel, which throws if you .on() after subscribe().
    const topic = `${channelName}:${instanceId}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          onPayloadRef.current(payload as RealtimePostgresChangesPayload<T>);
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR") {
          console.warn(`[realtime] CHANNEL_ERROR on ${topic}`, err);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelName, instanceId, table, event, filter, schema, enabled]);
}
