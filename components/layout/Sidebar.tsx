"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Home, LogOut, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];

type SidebarProps = {
  userHandle?: string | null;
  unreadCount?: number;
};

export function Sidebar({ userHandle, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

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
              pathname === href
                ? "bg-neon-cyan/10 text-neon-cyan border-l-2 border-neon-cyan"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Icon size={16} />
            {label}
            {href === "/notifications" && unreadCount > 0 && (
              <span className="ml-auto bg-neon-magenta px-1.5 font-pixel text-[8px]">{unreadCount}</span>
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

export function MobileNav({ userHandle, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t-2 border-white/10 bg-[#0a0a0f]/95 backdrop-blur md:hidden">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "relative flex flex-1 flex-col items-center gap-1 py-3 font-mono text-[10px]",
            pathname === href ? "text-neon-cyan" : "text-white/40"
          )}
        >
          <Icon size={18} />
          {label}
          {href === "/notifications" && unreadCount > 0 && (
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

export function NotificationBell({ userId }: { userId?: string | null }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
      .then(({ count: c }) => setCount(c ?? 0));

    const channel = supabase
      .channel("notif-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => setCount((c) => c + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
}
