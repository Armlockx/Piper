import type { Profile } from "@/lib/types/database";

export function isEmailVerified(profile: Pick<Profile, "email_verified_at"> | null | undefined) {
  return profile?.email_verified_at != null;
}
