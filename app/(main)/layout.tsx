import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { getCurrentProfile, getUnreadNotificationCount } from "@/lib/posts/queries";
import { ensureProfile } from "@/lib/profiles/ensureProfile";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = (await getCurrentProfile()) ?? (await ensureProfile(user));
  const unread = await getUnreadNotificationCount(user.id);

  return (
    <div className="flex min-h-screen">
      <Sidebar userHandle={profile?.handle} unreadCount={unread} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileNav userHandle={profile?.handle} unreadCount={unread} />
    </div>
  );
}
