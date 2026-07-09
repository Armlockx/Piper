import Groq from "groq-sdk";
import { sanitizeBotReply } from "@/lib/groq/sanitizeReply";

export type ChatTurn = {
  role: "system" | "user" | "assistant";
  content: string;
};

const MODELS = {
  default: "llama-3.1-8b-instant",
  advanced: "llama-3.3-70b-versatile",
} as const;

export function createGroqClient(apiKey = process.env.GROQ_API_KEY) {
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");
  return new Groq({ apiKey });
}

export async function runGroqChatCompletion(
  messages: ChatTurn[],
  model: keyof typeof MODELS = "default",
  options?: { maxTokens?: number; temperature?: number }
) {
  const client = createGroqClient();
  const response = await client.chat.completions.create({
    model: MODELS[model],
    messages,
    max_tokens: options?.maxTokens ?? 280,
    temperature: options?.temperature ?? 0.8,
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? "";

  return {
    reply: sanitizeBotReply(raw),
    raw,
    usage: response.usage,
  };
}
