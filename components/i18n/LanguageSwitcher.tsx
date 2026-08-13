"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_COOKIE, type AppLocale } from "@/lib/i18n/locale";

function persistLocale(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function LanguageSwitcher({
  persistToProfile = false,
}: {
  persistToProfile?: boolean;
}) {
  const t = useTranslations("Language");
  const locale = useLocale();
  const router = useRouter();

  async function change(next: AppLocale) {
    persistLocale(next);
    if (persistToProfile) {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_locale: next }),
      });
    }
    router.refresh();
  }

  return (
    <label className="flex flex-col gap-1 font-mono text-xs text-white/40">
      {t("label")}
      <select
        value={locale}
        onChange={(e) => void change(e.target.value as AppLocale)}
        className="bg-black/40 border-2 border-white/15 px-2 py-1 font-mono text-xs text-white/80 focus:border-neon-cyan focus:outline-none"
      >
        <option value="en">{t("en")}</option>
        <option value="pt">{t("pt")}</option>
      </select>
    </label>
  );
}
