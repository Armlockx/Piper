"use client";

import { useEffect } from "react";
import { LOCALE_COOKIE, isAppLocale } from "@/lib/i18n/locale";

export function LocaleSync({ preferredLocale }: { preferredLocale?: string | null }) {
  useEffect(() => {
    if (!isAppLocale(preferredLocale)) return;
    const current = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
      ?.split("=")[1];
    if (current === preferredLocale) return;
    document.cookie = `${LOCALE_COOKIE}=${preferredLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.location.reload();
  }, [preferredLocale]);

  return null;
}
