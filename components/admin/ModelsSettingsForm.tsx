"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LlmProviderPublic, LlmRoute } from "@/lib/types/database";

type Props = {
  initialProviders: LlmProviderPublic[];
  initialRoutes: LlmRoute[];
};

export function ModelsSettingsForm({ initialProviders, initialRoutes }: Props) {
  const t = useTranslations("Admin");
  const [providers, setProviders] = useState(initialProviders);
  const [routes, setRoutes] = useState(initialRoutes);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setProvider<K extends keyof LlmProviderPublic>(id: string, key: K, value: LlmProviderPublic[K]) {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  }

  function setRoute(jobType: string, patch: Partial<LlmRoute>) {
    setRoutes((prev) => prev.map((r) => (r.job_type === jobType ? { ...r, ...patch } : r)));
  }

  async function save() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providers: providers.map((p) => ({
            id: p.id,
            name: p.name,
            base_url: p.base_url,
            enabled: p.enabled,
            api_key: keys[p.id]?.trim() || undefined,
          })),
          routes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err =
          typeof data.error === "string"
            ? data.error
            : data.error?.formErrors?.[0] ?? t("failed");
        throw new Error(err);
      }
      setProviders(data.providers);
      setRoutes(data.routes);
      setKeys({});
      setMessage(t("saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 font-mono text-sm text-white/70">{t("providers")}</h2>
        <div className="flex flex-col gap-4">
          {providers.map((p) => (
            <div key={p.id} className="border-2 border-white/10 bg-black/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-mono text-sm text-neon-cyan">{p.name}</p>
                <label className="flex items-center gap-2 font-mono text-xs text-white/50">
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={(e) => setProvider(p.id, "enabled", e.target.checked)}
                  />
                  {t("enabled")}
                </label>
              </div>
              <label className="font-mono text-xs text-white/40">{t("baseUrl")}</label>
              <Input
                value={p.base_url}
                onChange={(e) => setProvider(p.id, "base_url", e.target.value)}
                className="mt-1 mb-3"
              />
              <label className="font-mono text-xs text-white/40">
                {p.key_configured
                  ? t("apiKeySaved", { hint: p.key_hint ?? "****" })
                  : t("apiKeyUnset")}
              </label>
              <Input
                type="password"
                autoComplete="off"
                placeholder={p.key_configured ? t("keepKey") : t("pasteKey")}
                value={keys[p.id] ?? ""}
                onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                className="mt-1"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-sm text-white/70">{t("routes")}</h2>
        <div className="flex flex-col gap-3">
          {routes.map((r) => (
            <div key={r.job_type} className="border-2 border-white/10 bg-black/30 p-4">
              <p className="mb-2 font-mono text-xs text-neon-magenta tracking-widest">
                {t(`jobs.${r.job_type}`)}
              </p>
              <label className="font-mono text-xs text-white/40">{t("provider")}</label>
              <select
                value={r.provider_id}
                onChange={(e) => setRoute(r.job_type, { provider_id: e.target.value })}
                className="mt-1 mb-3 w-full bg-black/40 border-2 border-white/15 px-4 py-2 font-mono text-sm focus:border-neon-cyan focus:outline-none"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <label className="font-mono text-xs text-white/40">{t("modelId")}</label>
              <Input
                value={r.model_id}
                onChange={(e) => setRoute(r.job_type, { model_id: e.target.value })}
                className="mt-1 mb-3"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-xs text-white/40">{t("maxTokens")}</label>
                  <Input
                    type="number"
                    value={r.max_tokens}
                    onChange={(e) => setRoute(r.job_type, { max_tokens: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="font-mono text-xs text-white/40">{t("temperature")}</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={r.temperature}
                    onChange={(e) => setRoute(r.job_type, { temperature: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {message && <p className="font-mono text-xs text-neon-cyan">{message}</p>}
      {error && <p className="font-mono text-xs text-red-400">{error}</p>}
      <Button onClick={save} disabled={loading}>
        {loading ? t("saving") : t("saveModels")}
      </Button>
    </div>
  );
}
