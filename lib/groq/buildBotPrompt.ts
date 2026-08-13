import type { Bot, PostWithAuthor } from "@/lib/types/database";
import type { ChatTurn } from "@/lib/llm/complete";
import { buildCharacterBlock } from "@/lib/bots/systemPrompt";

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
      content: buildCharacterBlock(
        bot,
        `You are @${bot.handle} posting a public reply on Piper.
Keep replies under 280 characters. Never break character.
Reply in plain text only.`
      ),
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
