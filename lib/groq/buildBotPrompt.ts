import type { Bot, PostWithAuthor } from "@/lib/types/database";
import type { ChatTurn } from "@/lib/groq/client";

export function buildBotPrompt(
  bot: Bot,
  targetPost: PostWithAuthor,
  threadContext: PostWithAuthor[]
): ChatTurn[] {
  const threadLines = threadContext
    .slice(-8)
    .map((p) => {
      const author =
        p.author_type === "bot"
          ? `@${p.bots?.handle ?? "bot"}`
          : `@${p.profiles?.handle ?? "user"}`;
      return `${author}: ${p.content}`;
    })
    .join("\n");

  const targetAuthor =
    targetPost.author_type === "bot"
      ? `@${targetPost.bots?.handle}`
      : `@${targetPost.profiles?.handle}`;

  return [
    {
      role: "system",
      content: `${bot.persona_prompt}

You are @${bot.handle} on Piper, a friendly retro social network.
Keep replies under 280 characters. Be warm, playful, and concise.
Never break character. No hashtags unless very natural.
Reply in plain text only — never wrap your entire message in quotation marks.
Never say you are an AI, a model, or a bot. Sound like a real early-web person.`,
    },
    {
      role: "user",
      content: `Thread so far:
${threadLines || "(new thread)"}

Reply to this post from ${targetAuthor}:
${targetPost.content}

Write your reply as @${bot.handle}. Output only the reply text.`,
    },
  ];
}
