"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Bookmark, Home, LogOut, MessageCircle, Search, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUnreadNotificationCount } from "@/components/layout/NotificationCountProvider";

const navItems = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/messages", label: "Chat", icon: MessageCircle },
  { href: "/search", label: "Search", icon: Search },
  { href: "/bookmarks", label: "Saved", icon: Bookmark },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];

type SidebarProps = {
  userHandle?: string | null;
  unreadCount?: number;
};

export function Sidebar({ userHandle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { count: badge } = useUnreadNotificationCount();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r-2 border-white/10 p-4">
      <Link href="/" className="font-pixel text-sm text-neon-cyan mb-8 tracking-widest">
        PIPER
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 font-mono text-sm transition-colors",
              pathname === href || (href !== "/" && pathname.startsWith(href))
                ? "bg-neon-cyan/10 text-neon-cyan border-l-2 border-neon-cyan"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Icon size={16} />
            {label}
            {href === "/notifications" && badge > 0 && (
              <span className="ml-auto bg-neon-magenta px-1.5 font-pixel text-[8px]">{badge}</span>
            )}
          </Link>
        ))}
        {userHandle && (
          <Link
            href={`/profile/${userHandle}`}
            className={cn(
              "flex items-center gap-3 px-3 py-2 font-mono text-sm transition-colors",
              pathname === `/profile/${userHandle}`
                ? "bg-neon-cyan/10 text-neon-cyan border-l-2 border-neon-cyan"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <User size={16} />
            Profile
          </Link>
        )}
      </nav>
      {userHandle && (
        <button
          type="button"
          onClick={logout}
          className="mt-auto flex items-center gap-3 px-3 py-2 font-mono text-sm text-white/40 hover:text-red-400"
        >
          <LogOut size={16} />
          Log out
        </button>
      )}
    </aside>
  );
}

export function MobileNav({ userHandle }: SidebarProps) {
  const pathname = usePathname();
  const { count: badge } = useUnreadNotificationCount();

  const mobileItems = [
    { href: "/", label: "Feed", icon: Home },
    { href: "/messages", label: "Chat", icon: MessageCircle },
    { href: "/search", label: "Search", icon: Search },
    { href: "/notifications", label: "Alerts", icon: Bell },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t-2 border-white/10 bg-[#0a0a0f]/95 backdrop-blur md:hidden">
      {mobileItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "relative flex flex-1 flex-col items-center gap-1 py-3 font-mono text-[10px]",
            pathname === href || (href !== "/" && pathname.startsWith(href))
              ? "text-neon-cyan"
              : "text-white/40"
          )}
        >
          <Icon size={18} />
          {label}
          {href === "/notifications" && badge > 0 && (
            <span className="absolute right-1/4 top-2 h-2 w-2 rounded-full bg-neon-magenta" />
          )}
        </Link>
      ))}
      {userHandle && (
        <Link
          href={`/profile/${userHandle}`}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-3 font-mono text-[10px]",
            pathname === `/profile/${userHandle}` ? "text-neon-cyan" : "text-white/40"
          )}
        >
          <User size={18} />
          Me
        </Link>
      )}
    </nav>
  );
}
