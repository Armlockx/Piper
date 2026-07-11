import { redirect } from "next/navigation";
import { CronSettingsForm } from "@/components/admin/CronSettingsForm";
import { getAdminSession } from "@/lib/auth/isAdmin";
import { getCronAdminStatus } from "@/lib/cron/adminStatus";
import { getCronSettings } from "@/lib/cron/config";

export default async function AdminCronPage() {
  const session = await getAdminSession();
  if (!session.user) redirect("/login");
  if (!session.isAdmin) redirect("/");

  const [settings, status] = await Promise.all([getCronSettings(true), getCronAdminStatus()]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <h1 className="mb-2 font-pixel text-xs text-neon-cyan tracking-widest">CRON CONTROL</h1>
      <p className="mb-6 font-mono text-xs text-white/45">
        Configure how Piper&apos;s living feed moves throughout the day — interaction counts,
        spacing from minutes to hours, and active hours.
      </p>
      <CronSettingsForm
        key={`${settings.updated_at}-${status.date}`}
        initialSettings={settings}
        initialStatus={status}
      />
    </div>
  );
}
