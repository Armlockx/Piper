import type { Bot, BotConversationState, ChatMessage } from "@/lib/types/database";
import type { ChatTurn } from "@/lib/llm/complete";
import { buildCharacterBlock } from "@/lib/bots/systemPrompt";

const MOOD_HINTS: Record<string, string> = {
  neutral: "balanced and present",
  playful: "playful, teasing, light jokes",
  curious: "curious, asking follow-ups",
  nostalgic: "nostalgic, but not costume-shop nostalgic",
  hype: "amped, then suspicious of the amp",
  chill: "relaxed and low-key",
  witty: "sharp and clever",
  warm: "warm without becoming a greeting card",
};

export function buildChatPrompt(
  bot: Bot,
  history: ChatMessage[],
  state: BotConversationState | null,
  userHandle: string
): ChatTurn[] {
  const mood = state?.mood ?? "neutral";
  const intensity = state?.mood_intensity ?? 5;
  const moodHint = MOOD_HINTS[mood] ?? mood;
  const summary = state?.summary?.trim();

  const recent = history.slice(-40);
  const transcript = recent
    .map((m) => {
      const who = m.sender_type === "bot" ? `@${bot.handle}` : `@${userHandle}`;
      return `${who}: ${m.content}`;
    })
    .join("\n");

  return [
    {
      role: "system",
      content: buildCharacterBlock(
        bot,
        `You are @${bot.handle} chatting privately with @${userHandle} on Piper.
This is a real conversation. Stay in character. Reference prior context when it matters. Ask questions. Improvise. Have opinions.
Current mood: ${mood} (intensity ${intensity}/10) — lean ${moodHint}.
${summary ? `Conversation memory (summary):\n${summary}` : "No long-term summary yet — build rapport from the transcript."}
Keep replies natural (1–4 short paragraphs unless your voice is tighter). Plain text only.`
      ),
    },
    {
      role: "user",
      content: `Chat so far:
${transcript || "(conversation just started)"}

Reply as @${bot.handle}. Output only the reply text.`,
    },
  ];
}

export function buildMoodUpdatePrompt(
  bot: Bot,
  history: ChatMessage[],
  previous: BotConversationState | null
): ChatTurn[] {
  const recent = history
    .slice(-20)
    .map((m) => `${m.sender_type}: ${m.content}`)
    .join("\n");

  return [
    {
      role: "system",
      content: `You update the emotional state of @${bot.handle} after a chat turn.
Reply with ONLY valid JSON, no markdown:
{"mood":"one of: neutral,playful,curious,nostalgic,hype,chill,witty,warm","mood_intensity":1-10,"summary":"<=200 chars rolling memory of the conversation"}`,
    },
    {
      role: "user",
      content: `Previous mood: ${previous?.mood ?? "neutral"} (${previous?.mood_intensity ?? 5})
Previous summary: ${previous?.summary ?? "(none)"}

Recent messages:
${recent}`,
    },
  ];
}
