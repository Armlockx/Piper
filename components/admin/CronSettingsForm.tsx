"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CronSettings } from "@/lib/types/database";
import type { CronAdminStatus } from "@/lib/cron/adminStatus";

type QuotaKey =
  | "bot_post"
  | "bot_reply_bot"
  | "bot_reply_user"
  | "organic_like"
  | "user_follow"
  | "bot_follow"
  | "soft_unfollow"
  | "spawn_bot";

const QUOTA_ROWS: { key: QuotaKey; label: string; hint: string }[] = [
  { key: "bot_post", label: "Bot posts", hint: "New posts from bots" },
  { key: "bot_reply_bot", label: "Bot → bot replies", hint: "Bots replying to each other" },
  { key: "bot_reply_user", label: "Bot → user replies", hint: "Bots engaging with humans" },
  { key: "organic_like", label: "Organic likes", hint: "Users liking recent posts" },
  { key: "user_follow", label: "User follows", hint: "User-to-user follows" },
  { key: "bot_follow", label: "Bot follows", hint: "Users following bots" },
  { key: "soft_unfollow", label: "Soft unfollows", hint: "Random follow removals" },
  { key: "spawn_bot", label: "Spawn bots", hint: "New AI bots per day" },
];

type FormState = CronSettings;

function formatTime(iso: string | null, timezone: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function CronSettingsForm({
  initialSettings,
  initialStatus,
}: {
  initialSettings: CronSettings;
  initialStatus: CronAdminStatus;
}) {
  const [form, setForm] = useState<FormState>(initialSettings);
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialSettings);
    setStatus(initialStatus);
  }, [initialSettings, initialStatus]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setQuotaMinMax(key: QuotaKey, field: "min" | "max", raw: string) {
    const num = Number(raw);
    const minKey = `${key}_${field}` as keyof FormState;
    setField(minKey, Number.isFinite(num) ? num : 0);
  }

  async function save() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/cron", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        const err =
          typeof data.error === "string"
            ? data.error
            : data.error?.formErrors?.[0] ?? "Failed to save";
        throw new Error(err);
      }
      setForm(data.settings);
      setStatus(data.status);
      setMessage("Settings saved. Changes apply to the next daily plan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="border-2 border-white/10 bg-black/30 p-4 sm:p-6">
        <h2 className="mb-3 font-pixel text-[10px] text-neon-cyan tracking-widest">TODAY</h2>
        <dl className="grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-3">
          <div>
            <dt className="text-white/40">Date ({status.timezone})</dt>
            <dd className="text-white/90">{status.date}</dd>
          </div>
          <div>
            <dt className="text-white/40">Queued today</dt>
            <dd className="text-white/90">{status.plannedCount}</dd>
          </div>
          <div>
            <dt className="text-white/40">Pending</dt>
            <dd className="text-neon-cyan">{status.pending}</dd>
          </div>
          <div>
            <dt className="text-white/40">Done</dt>
            <dd className="text-white/90">{status.done}</dd>
          </div>
          <div>
            <dt className="text-white/40">Failed</dt>
            <dd className={status.failed > 0 ? "text-red-400" : "text-white/90"}>{status.failed}</dd>
          </div>
          <div>
            <dt className="text-white/40">Next action</dt>
            <dd className="text-white/90">{formatTime(status.nextExecuteAt, status.timezone)}</dd>
          </div>
        </dl>
        <p className="mt-4 font-mono text-[11px] text-white/50">
          Estimated daily interactions with current ranges:{" "}
          <span className="text-neon-purple">
            {status.estimatedDailyActions.min}–{status.estimatedDailyActions.max}
          </span>
        </p>
      </section>

      <section className="border-2 border-white/10 bg-black/30 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-pixel text-[10px] text-neon-purple tracking-widest">CRON MASTER</h2>
          <label className="flex items-center gap-2 font-mono text-xs text-white/70">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setField("enabled", e.target.checked)}
              className="accent-neon-cyan"
            />
            Enabled
          </label>
        </div>
        <p className="mb-4 font-mono text-[11px] text-white/45">
          The daily planner runs once per day. Ticks every ~5 minutes process queued actions.
          Timing below controls how spread out activity feels across the day.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Min gap between actions (minutes)"
            value={form.slot_gap_min_minutes}
            onChange={(v) => setField("slot_gap_min_minutes", v)}
            min={1}
            max={720}
          />
          <Field
            label="Max gap between actions (minutes)"
            value={form.slot_gap_max_minutes}
            onChange={(v) => setField("slot_gap_max_minutes", v)}
            min={1}
            max={720}
          />
          <Field
            label="Planning horizon (hours)"
            value={form.planning_horizon_hours}
            onChange={(v) => setField("planning_horizon_hours", v)}
            min={1}
            max={48}
          />
          <Field
            label="Actions per tick"
            value={form.tick_batch_size}
            onChange={(v) => setField("tick_batch_size", v)}
            min={1}
            max={10}
          />
          <Field
            label="Active hours start (0–23)"
            value={form.awake_hour_start}
            onChange={(v) => setField("awake_hour_start", v)}
            min={0}
            max={23}
          />
          <Field
            label="Active hours end (0–23)"
            value={form.awake_hour_end}
            onChange={(v) => setField("awake_hour_end", v)}
            min={0}
            max={23}
          />
          <Field
            label="Chain reply chance (%)"
            value={form.chain_reply_chance_pct}
            onChange={(v) => setField("chain_reply_chance_pct", v)}
            min={0}
            max={100}
          />
          <Field
            label="Soft unfollow chance (%)"
            value={form.soft_unfollow_chance_pct}
            onChange={(v) => setField("soft_unfollow_chance_pct", v)}
            min={0}
            max={100}
          />
          <Field
            label="Chain reply delay min (minutes)"
            value={form.chain_reply_delay_min_minutes}
            onChange={(v) => setField("chain_reply_delay_min_minutes", v)}
            min={1}
            max={720}
          />
          <Field
            label="Chain reply delay max (minutes)"
            value={form.chain_reply_delay_max_minutes}
            onChange={(v) => setField("chain_reply_delay_max_minutes", v)}
            min={1}
            max={720}
          />
        </div>
      </section>

      <section className="border-2 border-white/10 bg-black/30 p-4 sm:p-6">
        <h2 className="mb-2 font-pixel text-[10px] text-neon-magenta tracking-widest">
          DAILY INTERACTIONS
        </h2>
        <p className="mb-4 font-mono text-[11px] text-white/45">
          Each day the planner picks a random count within these min/max ranges per action type.
        </p>
        <div className="space-y-4">
          {QUOTA_ROWS.map(({ key, label, hint }) => {
            const minKey = `${key}_min` as keyof FormState;
            const maxKey = `${key}_max` as keyof FormState;
            return (
              <div key={key} className="grid gap-2 sm:grid-cols-[1fr_5rem_5rem] sm:items-end">
                <div>
                  <p className="font-mono text-xs text-white/80">{label}</p>
                  <p className="font-mono text-[10px] text-white/40">{hint}</p>
                </div>
                <div>
                  <label className="font-mono text-[10px] text-white/40">Min</label>
                  <Input
                    type="number"
                    min={0}
                    value={form[minKey] as number}
                    onChange={(e) => setQuotaMinMax(key, "min", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-white/40">Max</label>
                  <Input
                    type="number"
                    min={0}
                    value={form[maxKey] as number}
                    onChange={(e) => setQuotaMinMax(key, "max", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {message && <p className="font-mono text-xs text-neon-cyan">{message}</p>}
      {error && <p className="font-mono text-xs text-red-400">{error}</p>}

      <Button onClick={save} disabled={loading} className="w-full sm:w-auto">
        {loading ? "Saving..." : "Save cron settings"}
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="font-mono text-xs text-white/40">{label}</label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1"
      />
    </div>
  );
}
