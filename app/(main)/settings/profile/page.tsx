import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";
import { getCurrentProfile } from "@/lib/posts/queries";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 font-pixel text-xs text-neon-purple tracking-widest">SETTINGS</h1>
      <ProfileSettingsForm profile={profile} />
    </div>
  );
}
