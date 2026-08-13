import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isAppLocale, LOCALE_COOKIE, negotiateLocale, type AppLocale } from "@/lib/i18n/locale";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale: AppLocale = negotiateLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
  const resolved = isAppLocale(locale) ? locale : DEFAULT_LOCALE;

  return {
    locale: resolved,
    messages: (await import(`../messages/${resolved}.json`)).default,
  };
});
