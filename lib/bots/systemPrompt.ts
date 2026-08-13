import type { Bot } from "@/lib/types/database";
import { compileVoice, voiceFromBot } from "@/lib/bots/compileVoice";
import { HOUSE_STYLE } from "@/lib/bots/houseStyle";

export function buildCharacterBlock(bot: Bot, extraRules: string): string {
  return [
    bot.persona_prompt,
    HOUSE_STYLE,
    voiceFromBot(bot),
    extraRules,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export { compileVoice, voiceFromBot };
