"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import type { Profile } from "@/lib/types/database";

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const t = useTranslations("Settings");
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function save() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, handle, bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.[0] ?? data.error ?? t("failed"));
      setMessage(t("saved"));
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-2 border-white/10 bg-black/30 p-6">
      <div className="flex flex-col gap-4">
        <div>
          <label className="font-mono text-xs text-white/40">{t("displayName")}</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="font-mono text-xs text-white/40">{t("handle")}</label>
          <Input value={handle} onChange={(e) => setHandle(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="font-mono text-xs text-white/40">{t("bio")}</label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1" maxLength={160} />
        </div>
        <LanguageSwitcher persistToProfile />
        {message && <p className="font-mono text-xs text-neon-cyan">{message}</p>}
        <Button onClick={save} disabled={loading}>
          {loading ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
