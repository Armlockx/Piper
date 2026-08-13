import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CronSettingsForm } from "@/components/admin/CronSettingsForm";
import { getAdminSession } from "@/lib/auth/isAdmin";
import {
  createSupabaseCronReportStore,
  cronReportTimeZone,
  listCronDayActions,
  listCronReport,
  reportRange,
} from "@/lib/cron/adminReport";
import { getCronAdminStatus } from "@/lib/cron/adminStatus";
import { getCronSettings } from "@/lib/cron/config";

export default async function AdminCronPage() {
  const session = await getAdminSession();
  if (!session.user) redirect("/login");
  if (!session.isAdmin) redirect("/");

  const t = await getTranslations("Admin");
  const timeZone = cronReportTimeZone();
  const { from, to } = reportRange(new Date(), timeZone);
  const store = createSupabaseCronReportStore();
  const [settings, status, report, todayActions] = await Promise.all([
    getCronSettings(true),
    getCronAdminStatus(),
    listCronReport({ from, to, timeZone, store }),
    listCronDayActions({ date: to, timeZone, store, limit: 50 }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-24">
      <h1 className="mb-2 font-pixel text-xs text-neon-cyan tracking-widest">{t("cronTitle")}</h1>
      <p className="mb-6 font-mono text-xs text-white/45">{t("cronBody")}</p>
      <CronSettingsForm
        key={`${settings.updated_at}-${status.date}`}
        initialSettings={settings}
        initialStatus={status}
        initialReport={report}
        initialActions={todayActions}
      />
    </div>
  );
}
