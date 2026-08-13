import { describe, expect, it } from "vitest";
import { encryptSecret } from "@/lib/llm/crypto";
import { resolveLlmEndpoint, type LlmJobType } from "@/lib/llm/resolve";

const wrappingKey = "wrap-me";
const job: LlmJobType = "chat";

describe("resolveLlmEndpoint", () => {
  it("uses the decrypted provider key and route model when both exist", () => {
    const { ciphertext, nonce } = encryptSecret("sk-or-live", wrappingKey);
    const resolved = resolveLlmEndpoint({
      jobType: job,
      wrappingKey,
      env: {},
      route: {
        model_id: "anthropic/claude-sonnet-4",
        max_tokens: 600,
        temperature: 0.9,
      },
      provider: {
        slug: "openrouter",
        base_url: "https://openrouter.ai/api/v1",
        api_key_ciphertext: ciphertext,
        api_key_nonce: nonce,
        enabled: true,
      },
    });
    expect(resolved.apiKey).toBe("sk-or-live");
    expect(resolved.modelId).toBe("anthropic/claude-sonnet-4");
    expect(resolved.baseUrl).toBe("https://openrouter.ai/api/v1");
    expect(resolved.maxTokens).toBe(600);
    expect(resolved.temperature).toBe(0.9);
  });

  it("falls back to OPENROUTER_API_KEY when the DB key is missing", () => {
    const resolved = resolveLlmEndpoint({
      jobType: job,
      wrappingKey,
      env: { OPENROUTER_API_KEY: "sk-or-env" },
      route: {
        model_id: "openai/gpt-4o-mini",
        max_tokens: 280,
        temperature: 0.8,
      },
      provider: {
        slug: "openrouter",
        base_url: "https://openrouter.ai/api/v1",
        api_key_ciphertext: null,
        api_key_nonce: null,
        enabled: true,
      },
    });
    expect(resolved.apiKey).toBe("sk-or-env");
    expect(resolved.modelId).toBe("openai/gpt-4o-mini");
  });

  it("falls back to Groq env + historical models when nothing is configured", () => {
    const resolved = resolveLlmEndpoint({
      jobType: "feed_mention",
      wrappingKey: undefined,
      env: { GROQ_API_KEY: "gsk-env" },
      route: null,
      provider: null,
    });
    expect(resolved.apiKey).toBe("gsk-env");
    expect(resolved.baseUrl).toBe("https://api.groq.com/openai/v1");
    expect(resolved.modelId).toBe("llama-3.3-70b-versatile");
  });

  it("throws when no key can be resolved", () => {
    expect(() =>
      resolveLlmEndpoint({
        jobType: job,
        wrappingKey: undefined,
        env: {},
        route: null,
        provider: null,
      })
    ).toThrow(/No LLM API key/);
  });
});
