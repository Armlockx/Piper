import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database";

function buildHandle(user: User): string {
  const fromEmail = user.email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "") ?? "";
  let base = fromEmail.length >= 3 ? fromEmail : `user${user.id.replace(/-/g, "").slice(0, 6)}`;
  if (base.length > 16) base = base.slice(0, 16);
  return base;
}

export async function ensureProfile(user: User): Promise<Profile> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing as Profile;

  const baseHandle = buildHandle(user);
  let finalHandle = baseHandle;
  let suffix = 0;

  while (true) {
    const { data: taken } = await admin
      .from("profiles")
      .select("id")
      .eq("handle", finalHandle)
      .maybeSingle();
    if (!taken) break;
    suffix += 1;
    finalHandle = `${baseHandle}${suffix}`;
  }

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ?? finalHandle;

  const { data, error } = await admin
    .from("profiles")
    .insert({
      id: user.id,
      handle: finalHandle,
      display_name: displayName,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}
