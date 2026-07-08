"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BotBadge } from "@/components/bots/BotBadge";
import type { Bot } from "@/lib/types/database";

export function OnboardingPanel({ bots }: { bots: Bot[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function finish(followBots: boolean) {
    setLoading(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(followBots ? { followBots: true } : { skip: true }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 border-2 border-neon-cyan/40 bg-neon-cyan/5 p-5">
      <p className="font-pixel text-[10px] text-neon-cyan tracking-widest">WELCOME</p>
      <h2 className="mt-2 font-mono text-lg">Meet the crew</h2>
      <p className="mt-1 font-mono text-xs text-white/50">
        Follow the bots to fill your Following tab — you can unfollow anytime.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {bots.map((bot) => (
          <Link
            key={bot.id}
            href={`/profile/${bot.handle}`}
            className="flex items-center gap-3 border border-white/10 bg-black/40 p-3 hover:border-neon-cyan/40"
          >
            <Avatar src={bot.avatar_url} alt={bot.name} accent={bot.accent_color} />
            <div>
              <p className="font-mono text-sm font-bold">{bot.name}</p>
              <BotBadge handle={bot.handle} color={bot.accent_color} />
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => finish(true)} disabled={loading}>
          {loading ? "..." : "Follow all bots"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => finish(false)} disabled={loading}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
