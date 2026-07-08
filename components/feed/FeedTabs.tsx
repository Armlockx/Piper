import Link from "next/link";
import { cn } from "@/lib/utils";

export function FeedTabs({ active }: { active: string }) {
  const tabs = [
    { id: "foryou", label: "For you", href: "/?tab=foryou" },
    { id: "following", label: "Following", href: "/?tab=following" },
  ];

  return (
    <div className="flex border-b-2 border-white/10">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={cn(
            "flex-1 py-3 text-center font-mono text-sm transition-colors",
            active === tab.id
              ? "border-b-2 border-neon-cyan text-neon-cyan -mb-[2px]"
              : "text-white/40 hover:text-white/70"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
