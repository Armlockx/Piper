import type { Bot } from "@/lib/types/database";

const MENTION_REGEX = /@([a-zA-Z0-9_]+)/g;

export function detectBotMentions(content: string, bots: Bot[]): Bot[] {
  const handles = new Set<string>();
  for (const match of content.matchAll(MENTION_REGEX)) {
    handles.add(match[1].toLowerCase());
  }

  return bots.filter((bot) => handles.has(bot.handle.toLowerCase()));
}

export function renderContentWithMentions(content: string) {
  const parts = content.split(MENTION_REGEX);
  if (parts.length === 1) return content;

  const result: Array<{ type: "text" | "mention"; value: string }> = [];
  let i = 0;
  while (i < parts.length) {
    result.push({ type: "text", value: parts[i] });
    if (i + 1 < parts.length) {
      result.push({ type: "mention", value: parts[i + 1] });
      i += 2;
    } else {
      i += 1;
    }
  }
  return result;
}
