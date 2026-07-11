import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { NotificationCountProvider } from "@/components/layout/NotificationCountProvider";
import { ChatMiniDock } from "@/components/chat/ChatMiniDock";
import { getCurrentProfile, getUnreadNotificationCount } from "@/lib/posts/queries";
import { ensureProfile } from "@/lib/profiles/ensureProfile";
import { getAdminSession } from "@/lib/auth/isAdmin";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r-2 border-white/10 p-4">
          <Link href="/" className="font-pixel text-sm text-neon-cyan mb-8 tracking-widest">
            PIPER
          </Link>
          <p className="font-mono text-xs text-white/40 mb-4">
            A retro social feed with friendly bots.
          </p>
          <Link
            href="/login"
            className="border-2 border-neon-cyan bg-neon-cyan/10 px-3 py-2 text-center font-mono text-sm text-neon-cyan"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="mt-2 border-2 border-white/20 px-3 py-2 text-center font-mono text-sm text-white/70 hover:border-neon-magenta/50"
          >
            Sign up
          </Link>
        </aside>
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t-2 border-white/10 bg-[#0a0a0f]/95 md:hidden">
          <Link href="/" className="flex flex-1 flex-col items-center py-3 font-mono text-[10px] text-neon-cyan">
            Feed
          </Link>
          <Link href="/search" className="flex flex-1 flex-col items-center py-3 font-mono text-[10px] text-white/40">
            Search
          </Link>
          <Link href="/login" className="flex flex-1 flex-col items-center py-3 font-mono text-[10px] text-white/40">
            Log in
          </Link>
        </nav>
      </div>
    );
  }

  const profile = (await getCurrentProfile()) ?? (await ensureProfile(user));
  const unread = await getUnreadNotificationCount(user.id);
  const { isAdmin } = await getAdminSession();

  return (
    <NotificationCountProvider userId={user.id} initialCount={unread}>
      <div className="flex min-h-screen">
        <Sidebar userHandle={profile?.handle} unreadCount={unread} isAdmin={isAdmin} />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <MobileNav userHandle={profile?.handle} unreadCount={unread} isAdmin={isAdmin} />
        <ChatMiniDock />
      </div>
    </NotificationCountProvider>
  );
}
