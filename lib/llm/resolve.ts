import { decryptSecret } from "@/lib/llm/crypto";

export type LlmJobType =
  | "feed_auto"
  | "feed_mention"
  | "chat"
  | "mood"
  | "cron_post"
  | "cron_reply"
  | "spawn";

export type ChatTurn = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmRouteRow = {
  model_id: string;
  max_tokens: number;
  temperature: number;
};

export type LlmProviderRow = {
  slug: string;
  base_url: string;
  api_key_ciphertext: string | null;
  api_key_nonce: string | null;
  enabled: boolean;
};

export type ResolvedLlmEndpoint = {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  maxTokens: number;
  temperature: number;
};

export const GROQ_OPENAI_BASE = "https://api.groq.com/openai/v1";
export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export const GROQ_FALLBACK: Record<LlmJobType, { model: string; maxTokens: number; temperature: number }> = {
  feed_auto: { model: "llama-3.1-8b-instant", maxTokens: 280, temperature: 0.8 },
  feed_mention: { model: "llama-3.3-70b-versatile", maxTokens: 280, temperature: 0.8 },
  chat: { model: "llama-3.3-70b-versatile", maxTokens: 600, temperature: 0.9 },
  mood: { model: "llama-3.1-8b-instant", maxTokens: 200, temperature: 0.4 },
  cron_post: { model: "llama-3.1-8b-instant", maxTokens: 280, temperature: 0.8 },
  cron_reply: { model: "llama-3.1-8b-instant", maxTokens: 280, temperature: 0.8 },
  spawn: { model: "llama-3.1-8b-instant", maxTokens: 400, temperature: 1.0 },
};

function tryDecrypt(
  provider: LlmProviderRow,
  wrappingKey: string | undefined
): string | null {
  if (!provider.api_key_ciphertext || !provider.api_key_nonce || !wrappingKey) {
    return null;
  }
  try {
    return decryptSecret(provider.api_key_ciphertext, provider.api_key_nonce, wrappingKey);
  } catch {
    return null;
  }
}

function envKeyForProvider(
  slug: string,
  env: { OPENROUTER_API_KEY?: string; GROQ_API_KEY?: string }
): string | undefined {
  if (slug === "openrouter") return env.OPENROUTER_API_KEY || undefined;
  if (slug === "groq") return env.GROQ_API_KEY || undefined;
  return env.OPENROUTER_API_KEY || env.GROQ_API_KEY || undefined;
}

export function resolveLlmEndpoint(input: {
  jobType: LlmJobType;
  wrappingKey: string | undefined;
  env: { OPENROUTER_API_KEY?: string; GROQ_API_KEY?: string };
  route: LlmRouteRow | null;
  provider: LlmProviderRow | null;
}): ResolvedLlmEndpoint {
  const fallback = GROQ_FALLBACK[input.jobType];

  if (input.provider?.enabled && input.route) {
    const decrypted = tryDecrypt(input.provider, input.wrappingKey);
    const envKey = envKeyForProvider(input.provider.slug, input.env);
    const apiKey = decrypted || envKey;
    if (apiKey) {
      return {
        baseUrl: input.provider.base_url.replace(/\/$/, ""),
        apiKey,
        modelId: input.route.model_id,
        maxTokens: input.route.max_tokens,
        temperature: input.route.temperature,
      };
    }
  }

  if (input.env.GROQ_API_KEY) {
    return {
      baseUrl: GROQ_OPENAI_BASE,
      apiKey: input.env.GROQ_API_KEY,
      modelId: fallback.model,
      maxTokens: fallback.maxTokens,
      temperature: fallback.temperature,
    };
  }

  if (input.env.OPENROUTER_API_KEY) {
    return {
      baseUrl: OPENROUTER_BASE,
      apiKey: input.env.OPENROUTER_API_KEY,
      modelId: input.route?.model_id ?? fallback.model,
      maxTokens: input.route?.max_tokens ?? fallback.maxTokens,
      temperature: input.route?.temperature ?? fallback.temperature,
    };
  }

  throw new Error("No LLM API key configured. Add a key in /admin/models or set OPENROUTER_API_KEY / GROQ_API_KEY.");
}
