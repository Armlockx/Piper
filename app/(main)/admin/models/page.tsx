import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ModelsSettingsForm } from "@/components/admin/ModelsSettingsForm";
import { getAdminSession } from "@/lib/auth/isAdmin";
import { getLlmAdminConfig } from "@/lib/llm/admin";

export default async function AdminModelsPage() {
  const session = await getAdminSession();
  if (!session.user) redirect("/login");
  if (!session.isAdmin) redirect("/");

  const t = await getTranslations("Admin");
  const config = await getLlmAdminConfig();

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-24">
      <h1 className="mb-2 font-pixel text-xs text-neon-magenta tracking-widest">{t("modelsTitle")}</h1>
      <p className="mb-6 font-mono text-xs text-white/45">{t("modelsBody")}</p>
      <ModelsSettingsForm
        key={config.providers.map((p) => p.updated_at).join("-")}
        initialProviders={config.providers}
        initialRoutes={config.routes}
      />
    </div>
  );
}
