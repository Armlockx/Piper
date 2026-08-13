export const LOCALES = ["en", "pt"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "en" || value === "pt";
}

export function parseAcceptLanguage(header: string | null | undefined): AppLocale | null {
  if (!header) return null;
  const parts = header.split(",").map((part) => {
    const [tag, ...params] = part.trim().split(";");
    const q = params.find((p) => p.trim().startsWith("q="));
    const quality = q ? Number(q.trim().slice(2)) : 1;
    return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 1 };
  });
  parts.sort((a, b) => b.quality - a.quality);
  for (const { tag } of parts) {
    if (tag === "pt" || tag.startsWith("pt-")) return "pt";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return null;
}

export function negotiateLocale(input: {
  profileLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  if (isAppLocale(input.profileLocale)) return input.profileLocale;
  if (isAppLocale(input.cookieLocale)) return input.cookieLocale;
  return parseAcceptLanguage(input.acceptLanguage) ?? DEFAULT_LOCALE;
}
