import { describe, expect, it } from "vitest";
import { familyForModel, groupCatalogModels, toCatalogModels } from "@/lib/llm/catalog";

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
