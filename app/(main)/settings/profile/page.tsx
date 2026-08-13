import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";
import { VerificationSection } from "@/components/profile/VerificationSection";
import { getCurrentProfile } from "@/lib/posts/queries";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; verify_error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const params = await searchParams;
  const t = await getTranslations("Settings");

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 font-pixel text-xs text-neon-purple tracking-widest">{t("title")}</h1>
      <VerificationSection
        profile={profile}
        justVerified={params.verified === "1"}
        verifyError={params.verify_error ?? null}
      />
      <ProfileSettingsForm profile={profile} />
    </div>
  );
}
