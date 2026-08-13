import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveLlmEndpoint,
  type ChatTurn,
  type LlmJobType,
  type LlmProviderRow,
  type LlmRouteRow,
} from "@/lib/llm/resolve";
import { sanitizeBotReply } from "@/lib/llm/sanitizeReply";

export type { ChatTurn, LlmJobType };

export async function runLlmCompletion(
  jobType: LlmJobType,
  messages: ChatTurn[],
  options?: { maxTokens?: number; temperature?: number; json?: boolean }
) {
  const endpoint = await loadEndpoint(jobType);
  const maxTokens = options?.maxTokens ?? endpoint.maxTokens;
  const temperature = options?.temperature ?? endpoint.temperature;

  const url = `${endpoint.baseUrl}/chat/completions`;
  const body: Record<string, unknown> = {
    model: endpoint.modelId,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (options?.json) {
    body.response_format = { type: "json_object" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${endpoint.apiKey}`,
    "Content-Type": "application/json",
  };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) headers["HTTP-Referer"] = appUrl;
  headers["X-Title"] = "Piper";

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`LLM request failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

  return {
    reply: sanitizeBotReply(raw),
    raw,
  };
}

async function loadEndpoint(jobType: LlmJobType) {
  const admin = createAdminClient();
  const { data: route } = await admin
    .from("llm_routes")
    .select("model_id, max_tokens, temperature, provider_id")
    .eq("job_type", jobType)
    .maybeSingle();

  let provider: LlmProviderRow | null = null;
  if (route?.provider_id) {
    const { data } = await admin
      .from("llm_providers")
      .select("slug, base_url, api_key_ciphertext, api_key_nonce, enabled")
      .eq("id", route.provider_id)
      .maybeSingle();
    provider = (data as LlmProviderRow | null) ?? null;
  }

  return resolveLlmEndpoint({
    jobType,
    wrappingKey: process.env.LLM_ENCRYPTION_KEY,
    env: {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
    },
    route: (route as LlmRouteRow | null) ?? null,
    provider,
  });
}
