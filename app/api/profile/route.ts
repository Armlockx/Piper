import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";

const profileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(160).optional(),
  handle: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/).optional(),
  preferred_locale: z.enum(["en", "pt"]).optional(),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({ profile: data });
  if (parsed.data.preferred_locale) {
    response.cookies.set(LOCALE_COOKIE, parsed.data.preferred_locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}
