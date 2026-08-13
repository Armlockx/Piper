"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, Bookmark, Cpu, Gauge, Home, LogOut, MessageCircle, Search, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUnreadNotificationCount } from "@/components/layout/NotificationCountProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

type SidebarProps = {
  userHandle?: string | null;
  unreadCount?: number;
  isAdmin?: boolean;
};

export function Sidebar({ userHandle, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Nav");
  const { count: badge } = useUnreadNotificationCount();

  const navItems = [
    { href: "/", label: t("feed"), icon: Home },
    { href: "/messages", label: t("chat"), icon: MessageCircle },
    { href: "/search", label: t("search"), icon: Search },
    { href: "/bookmarks", label: t("saved"), icon: Bookmark },
    { href: "/notifications", label: t("alerts"), icon: Bell },
    { href: "/settings/profile", label: t("settings"), icon: Settings },
  ];

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
        {isAdmin && (
          <>
            <Link
              href="/admin/cron"
              className={cn(
                "flex items-center gap-3 px-3 py-2 font-mono text-sm transition-colors",
                pathname.startsWith("/admin/cron")
                  ? "bg-neon-magenta/10 text-neon-magenta border-l-2 border-neon-magenta"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Gauge size={16} />
              {t("cron")}
            </Link>
            <Link
              href="/admin/models"
              className={cn(
                "flex items-center gap-3 px-3 py-2 font-mono text-sm transition-colors",
                pathname.startsWith("/admin/models")
                  ? "bg-neon-magenta/10 text-neon-magenta border-l-2 border-neon-magenta"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Cpu size={16} />
              {t("models")}
            </Link>
          </>
        )}
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
            {t("profile")}
          </Link>
        )}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <LanguageSwitcher persistToProfile={Boolean(userHandle)} />
        {userHandle && (
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 font-mono text-sm text-white/40 hover:text-red-400"
          >
            <LogOut size={16} />
            {t("logout")}
          </button>
        )}
      </div>
    </aside>
  );
}

export function MobileNav({ userHandle, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const { count: badge } = useUnreadNotificationCount();

  const mobileItems = [
    { href: "/", label: t("feed"), icon: Home },
    { href: "/messages", label: t("chat"), icon: MessageCircle },
    { href: "/search", label: t("search"), icon: Search },
    { href: "/notifications", label: t("alerts"), icon: Bell },
    ...(isAdmin
      ? [
          { href: "/admin/cron", label: t("cron"), icon: Gauge },
          { href: "/admin/models", label: t("models"), icon: Cpu },
        ]
      : []),
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
          {t("me")}
        </Link>
      )}
    </nav>
  );
}
