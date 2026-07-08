import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database";

const RESEND_COOLDOWN_MS = 60_000;

export type SendVerificationResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

/**
 * Sends an optional magic-link email. Confirm email must stay OFF in Dashboard
 * so signup/login are never blocked. Badge uses profiles.email_verified_at.
 */
export async function sendVerificationEmail(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<SendVerificationResult> {
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email_verified_at, verification_sent_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: profileError.message };
  }

  const p = profile as Pick<Profile, "email_verified_at" | "verification_sent_at"> | null;

  if (p?.email_verified_at) {
    return { ok: false, status: 400, error: "Already verified" };
  }

  if (p?.verification_sent_at) {
    const elapsed = Date.now() - new Date(p.verification_sent_at).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return { ok: false, status: 429, error: `Wait ${wait}s before resend` };
    }
  }

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${appUrl()}/auth/verify`,
    },
  });

  if (otpError) {
    return { ok: false, status: 500, error: otpError.message };
  }

  await admin
    .from("profiles")
    .update({ verification_sent_at: new Date().toISOString() })
    .eq("id", userId);

  return { ok: true };
}
