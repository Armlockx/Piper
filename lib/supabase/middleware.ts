import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, negotiateLocale } from "@/lib/i18n/locale";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!request.cookies.get(LOCALE_COOKIE)?.value) {
    const locale = negotiateLocale({
      acceptLanguage: request.headers.get("accept-language"),
    });
    supabaseResponse.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const locale = supabaseResponse.cookies.get(LOCALE_COOKIE);
        supabaseResponse = NextResponse.next({ request });
        if (locale) {
          supabaseResponse.cookies.set(locale);
        }
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();
  return supabaseResponse;
}
