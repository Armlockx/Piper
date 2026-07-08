import type { Bot } from "@/lib/types/database";

const AUTO_REPLY_CHANCE = 0.3;

export function shouldAutoReply(isTopLevel: boolean): boolean {
  if (!isTopLevel) return Math.random() < 0.15;
  return Math.random() < AUTO_REPLY_CHANCE;
}

export function pickAutoBot(bots: Bot[]): Bot | null {
  if (bots.length === 0) return null;

  const totalWeight = bots.reduce((sum, b) => sum + b.auto_reply_weight, 0);
  let roll = Math.random() * totalWeight;

  for (const bot of bots) {
    roll -= bot.auto_reply_weight;
    if (roll <= 0) return bot;
  }

  return bots[0];
}
