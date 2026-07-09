"use client";

import { cn } from "@/lib/utils";

const MOOD_COLORS: Record<string, string> = {
  neutral: "text-white/50 border-white/20",
  playful: "text-neon-magenta border-neon-magenta/40",
  curious: "text-neon-cyan border-neon-cyan/40",
  nostalgic: "text-neon-purple border-neon-purple/40",
  hype: "text-neon-amber border-neon-amber/40",
  chill: "text-white/60 border-white/30",
  witty: "text-neon-cyan border-neon-cyan/30",
  warm: "text-neon-amber border-neon-amber/30",
};

export function BotMoodBadge({
  mood,
  intensity,
}: {
  mood: string;
  intensity?: number;
}) {
  const style = MOOD_COLORS[mood] ?? MOOD_COLORS.neutral;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-pixel text-[7px] tracking-wider uppercase",
        style
      )}
      title={intensity != null ? `Intensity ${intensity}/10` : undefined}
    >
      {mood}
      {intensity != null && <span className="opacity-60">{intensity}</span>}
    </span>
  );
}
