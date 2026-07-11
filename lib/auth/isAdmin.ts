import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

function parseAllowlist(envValue: string | undefined): string[] {
  if (!envValue?.trim()) return [];
  return envValue
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminProfile(profile: Pick<Profile, "id" | "is_admin"> | null, email?: string | null) {
  if (!profile) return false;
  if (profile.is_admin) return true;

  const allowedIds = parseAllowlist(process.env.ADMIN_USER_IDS);
  if (allowedIds.includes(profile.id.toLowerCase())) return true;

  const allowedEmails = parseAllowlist(process.env.ADMIN_EMAILS);
  if (email && allowedEmails.includes(email.toLowerCase())) return true;

  return false;
}

export async function getAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null, isAdmin: false as const };

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const isAdmin = isAdminProfile(profile, user.email);

  return { user, profile, isAdmin };
}

export async function requireAdminApi() {
  const session = await getAdminSession();
  if (!session.user || !session.isAdmin) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  return { ok: true as const, ...session };
}
