import { redirect } from "next/navigation";
import { NotificationList } from "@/components/notifications/NotificationList";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(*), bot:bots(*), post:posts(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 font-pixel text-xs text-neon-amber tracking-widest">ALERTS</h1>
      <NotificationList initial={data ?? []} />
    </div>
  );
}
