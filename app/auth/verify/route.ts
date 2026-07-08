import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailOtpType } from "@supabase/supabase-js";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "email";
  const code = searchParams.get("code");
  const next = `${appUrl()}/settings/profile?verified=1`;

  const fail = (message: string) =>
    NextResponse.redirect(
      `${appUrl()}/settings/profile?verify_error=${encodeURIComponent(message)}`
    );

  const supabase = await createClient();

  try {
    if (token_hash) {
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });
      if (error) return fail(error.message);
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return fail(error.message);
    } else {
      return fail("Missing verification token");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return fail("Could not load user after verification");

    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", user.id)
      .is("email_verified_at", null);

    return NextResponse.redirect(next);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Verification failed");
  }
}
