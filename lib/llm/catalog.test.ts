import { describe, expect, it } from "vitest";
import { encryptSecret } from "@/lib/llm/crypto";
import {
  apiKeyForProvider,
  familyForModel,
  fetchProviderModels,
  groupCatalogModels,
  loadProviderCatalog,
  parseCatalogProviderId,
  toCatalogModels,
} from "@/lib/llm/catalog";

describe("familyForModel", () => {
  it("uses the slash prefix", () => {
    expect(familyForModel("anthropic/claude-sonnet-4", "anthropic", "openrouter")).toBe(
      "anthropic"
    );
  });

  it("uses owned_by when there is no slash", () => {
    expect(familyForModel("llama-3.1-8b-instant", "Meta", "groq")).toBe("meta");
  });

  it("falls back to provider slug", () => {
    expect(familyForModel("llama-3.1-8b-instant", null, "groq")).toBe("groq");
    expect(familyForModel("llama-3.1-8b-instant", "  ", "groq")).toBe("groq");
  });
});

describe("toCatalogModels", () => {
  it("maps OpenAI-shaped data with name fallback to id", () => {
    const models = toCatalogModels(
      {
        data: [
          { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
          { id: "llama-3.1-8b-instant", owned_by: "Meta" },
        ],
      },
      "groq"
    );
    expect(models).toEqual([
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", family: "anthropic" },
      { id: "llama-3.1-8b-instant", name: "llama-3.1-8b-instant", family: "meta" },
    ]);
  });

  it("returns an empty list for empty data", () => {
    expect(toCatalogModels({ data: [] }, "openrouter")).toEqual([]);
  });

  it("throws CatalogError 502 when payload is not { data: array }", () => {
    expect(() => toCatalogModels({ models: [] }, "openrouter")).toThrow(/unexpected models payload/);
  });
});

describe("groupCatalogModels", () => {
  it("groups a mixed list by family and sorts family headings", () => {
    const grouped = groupCatalogModels([
      { id: "openai/gpt-4o", name: "gpt-4o", family: "openai" },
      { id: "anthropic/claude-sonnet-4", name: "sonnet", family: "anthropic" },
      { id: "openai/gpt-4o-mini", name: "mini", family: "openai" },
    ]);
    expect(grouped.map((g) => g.family)).toEqual(["anthropic", "openai"]);
    expect(grouped[1].models.map((m) => m.id)).toEqual(["openai/gpt-4o", "openai/gpt-4o-mini"]);
  });
});

describe("apiKeyForProvider", () => {
  it("prefers the decrypted stored key", () => {
    const wrappingKey = "wrap-me";
    const { ciphertext, nonce } = encryptSecret("sk-stored", wrappingKey);
    expect(
      apiKeyForProvider(
        { slug: "openrouter", api_key_ciphertext: ciphertext, api_key_nonce: nonce },
        wrappingKey,
        { OPENROUTER_API_KEY: "sk-env" }
      )
    ).toBe("sk-stored");
  });

  it("falls back to env by slug", () => {
    expect(
      apiKeyForProvider(
        { slug: "groq", api_key_ciphertext: null, api_key_nonce: null },
        undefined,
        { GROQ_API_KEY: "gsk-env" }
      )
    ).toBe("gsk-env");
  });

  it("returns null when nothing is configured", () => {
    expect(
      apiKeyForProvider(
        { slug: "openrouter", api_key_ciphertext: null, api_key_nonce: null },
        undefined,
        {}
      )
    ).toBeNull();
  });
});

describe("fetchProviderModels", () => {
  it("GETs {baseUrl}/models and maps the payload", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      expect(String(input)).toBe("https://openrouter.ai/api/v1/models");
      return new Response(JSON.stringify({ data: [{ id: "openai/gpt-4o", name: "GPT-4o" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const models = await fetchProviderModels({
      baseUrl: "https://openrouter.ai/api/v1/",
      apiKey: "sk-test",
      slug: "openrouter",
      fetchImpl,
    });
    expect(models).toEqual([{ id: "openai/gpt-4o", name: "GPT-4o", family: "openai" }]);
  });

  it("throws 502 with a body snippet when the provider HTTP fails", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("upstream exploded ".repeat(20), { status: 500 });
    await expect(
      fetchProviderModels({
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: "gsk",
        slug: "groq",
        fetchImpl,
      })
    ).rejects.toMatchObject({ httpStatus: 502, message: expect.stringMatching(/^.{1,200}$/) });
  });
});

describe("parseCatalogProviderId", () => {
  it("accepts a uuid and rejects junk", () => {
    expect(parseCatalogProviderId("11111111-1111-1111-8111-111111111111")).toBe(
      "11111111-1111-1111-8111-111111111111"
    );
    expect(parseCatalogProviderId("nope")).toBeNull();
    expect(parseCatalogProviderId(null)).toBeNull();
  });
});

describe("loadProviderCatalog", () => {
  it("throws 400 when no key can be resolved", async () => {
    await expect(
      loadProviderCatalog(
        {
          id: "11111111-1111-1111-1111-111111111111",
          slug: "openrouter",
          base_url: "https://openrouter.ai/api/v1",
          api_key_ciphertext: null,
          api_key_nonce: null,
        },
        { env: {} }
      )
    ).rejects.toMatchObject({ httpStatus: 400 });
  });

  it("throws 404 when the provider is missing", async () => {
    await expect(loadProviderCatalog(null, { env: {} })).rejects.toMatchObject({
      httpStatus: 404,
    });
  });
});
