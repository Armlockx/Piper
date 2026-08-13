"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Button } from "@/components/ui/button";

const CRON_ACTION_STATUSES = ["pending", "processing", "done", "failed", "cancelled"] as const;
const CRON_ACTION_TYPES = [
  "bot_post",
  "bot_reply_bot",
  "bot_reply_user",
  "organic_like",
  "user_follow",
  "bot_follow",
  "soft_unfollow",
  "spawn_bot",
] as const;

export type CronReportDay = {
  date: string;
  pending: number;
  processing: number;
  done: number;
  failed: number;
  cancelled: number;
};

export type CronHistoryRow = {
  id: string;
  action_type: string;
  status: string;
  execute_at: string;
  processed_at: string | null;
  error: string | null;
};

export type CronDayActionsPayload = {
  date: string;
  totals: Omit<CronReportDay, "date">;
  actions: CronHistoryRow[];
  nextCursor: string | null;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  return data as T;
}

function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function truncateError(error: string | null) {
  if (!error) return "";
  return error.length > 80 ? `${error.slice(0, 80)}…` : error;
}

function dayQueued(day: CronReportDay) {
  return day.pending + day.processing;
}

export function CronReportPanel({
  timezone,
  initialFrom,
  initialTo,
  initialDays,
  initialActions,
  reloadRef,
}: {
  timezone: string;
  initialFrom: string;
  initialTo: string;
  initialDays: CronReportDay[];
  initialActions: CronDayActionsPayload;
  reloadRef: MutableRefObject<(() => void) | null>;
}) {
  const [days, setDays] = useState(initialDays);
  const [selectedDate, setSelectedDate] = useState(initialTo);
  const [totals, setTotals] = useState(initialActions.totals);
  const [actions, setActions] = useState(initialActions.actions);
  const [nextCursor, setNextCursor] = useState(initialActions.nextCursor);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const skipFirstList = useRef(true);

  async function loadList(reset: boolean, date = selectedDate) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date });
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("action_type", typeFilter);
      if (!reset && nextCursor) params.set("cursor", nextCursor);
      const data = await fetchJson<CronDayActionsPayload>(`/api/admin/cron/actions?${params}`);
      setTotals(data.totals);
      setActions((prev) => (reset ? data.actions : [...prev, ...data.actions]));
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const report = await fetchJson<{ days: CronReportDay[] }>(
        `/api/admin/cron/report?from=${initialFrom}&to=${initialTo}`
      );
      setDays(report.days);
      const params = new URLSearchParams({ date: selectedDate });
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("action_type", typeFilter);
      const data = await fetchJson<CronDayActionsPayload>(`/api/admin/cron/actions?${params}`);
      setTotals(data.totals);
      setActions(data.actions);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadRef.current = () => {
      void loadReport();
    };
    return () => {
      reloadRef.current = null;
    };
  });

  useEffect(() => {
    if (skipFirstList.current) {
      skipFirstList.current = false;
      return;
    }
    void loadList(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- date/filter changes reset the list
  }, [selectedDate, statusFilter, typeFilter]);

  const max = Math.max(1, ...days.map((d) => d.done + d.failed + dayQueued(d)));

  return (
    <section className="border-2 border-white/10 bg-black/30 p-4 sm:p-6">
      <h2 className="mb-3 font-pixel text-[10px] text-neon-magenta tracking-widest">7 DAYS + HISTORY</h2>
      <div className="mb-4 flex h-24 items-end gap-1">
        {days.map((day) => {
          const queued = dayQueued(day);
          const selected = day.date === selectedDate;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(day.date)}
              className={`flex min-h-[2px] flex-1 flex-col justify-end ${
                selected ? "outline outline-1 outline-neon-magenta" : ""
              }`}
              title={`${day.date}: ${day.done} done, ${day.failed} failed, ${queued} queued`}
            >
              <div className="flex w-full flex-col justify-end" style={{ height: "100%" }}>
                {day.failed > 0 && (
                  <div
                    className="w-full bg-red-400"
                    style={{ height: `${(day.failed / max) * 100}%` }}
                  />
                )}
                {day.done > 0 && (
                  <div
                    className="w-full bg-neon-cyan"
                    style={{ height: `${(day.done / max) * 100}%` }}
                  />
                )}
                {queued > 0 && (
                  <div
                    className="w-full bg-white/20"
                    style={{ height: `${(queued / max) * 100}%` }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mb-3 font-mono text-xs text-white/70">
        {selectedDate} · P {totals.pending} · D {totals.done} · F{" "}
        <span className={totals.failed > 0 ? "text-red-400" : ""}>{totals.failed}</span>
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black/40 border-2 border-white/15 px-2 py-1 font-mono text-xs focus:border-neon-cyan focus:outline-none"
        >
          <option value="">All statuses</option>
          {CRON_ACTION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-black/40 border-2 border-white/15 px-2 py-1 font-mono text-xs focus:border-neon-cyan focus:outline-none"
        >
          <option value="">All types</option>
          {CRON_ACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mb-2 font-mono text-xs text-red-400">{error}</p>}
      {actions.length === 0 && !loading ? (
        <p className="font-mono text-xs text-white/40">No actions this day.</p>
      ) : (
        <ul className="space-y-1 font-mono text-xs">
          {actions.map((row) => (
            <li key={row.id} className="flex flex-wrap gap-x-2 text-white/80">
              <span className="text-white/50">{formatTime(row.execute_at, timezone)}</span>
              <span className={row.status === "failed" ? "text-red-400" : "text-white/70"}>{row.status}</span>
              <span>{row.action_type}</span>
              {row.error && <span className="text-red-400/80">{truncateError(row.error)}</span>}
            </li>
          ))}
        </ul>
      )}
      {nextCursor && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={loading}
          onClick={() => void loadList(false)}
        >
          {loading ? "Loading..." : "Load more"}
        </Button>
      )}
    </section>
  );
}
