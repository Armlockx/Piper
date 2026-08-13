import { decryptSecret } from "@/lib/llm/crypto";

export type CatalogModel = {
  id: string;
  name: string;
  family: string;
};

export class CatalogError extends Error {
  readonly httpStatus: 400 | 404 | 502;

  constructor(message: string, httpStatus: 400 | 404 | 502) {
    super(message);
    this.name = "CatalogError";
    this.httpStatus = httpStatus;
  }
}

export function parseCatalogProviderId(raw: string | null): string | null {
  if (!raw) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : null;
}

export function familyForModel(
  id: string,
  ownedBy: string | null | undefined,
  providerSlug: string
): string {
  const slash = id.indexOf("/");
  if (slash > 0) return id.slice(0, slash).toLowerCase();
  const owner = ownedBy?.trim();
  if (owner) return owner.toLowerCase();
  return providerSlug.toLowerCase();
}

export function toCatalogModels(payload: unknown, providerSlug: string): CatalogModel[] {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new CatalogError("unexpected models payload", 502);
  }
  const data = (payload as { data: unknown }).data;
  if (!Array.isArray(data)) {
    throw new CatalogError("unexpected models payload", 502);
  }
  return data.map((row) => {
    const rec = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const id = typeof rec.id === "string" ? rec.id : "";
    const name = typeof rec.name === "string" && rec.name.trim() ? rec.name : id;
    const ownedBy = typeof rec.owned_by === "string" ? rec.owned_by : null;
    return { id, name, family: familyForModel(id, ownedBy, providerSlug) };
  });
}

export function groupCatalogModels(
  models: CatalogModel[]
): { family: string; models: CatalogModel[] }[] {
  const map = new Map<string, CatalogModel[]>();
  for (const model of models) {
    const list = map.get(model.family) ?? [];
    list.push(model);
    map.set(model.family, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([family, grouped]) => ({ family, models: grouped }));
}

export type ProviderKeyEnv = { OPENROUTER_API_KEY?: string; GROQ_API_KEY?: string };

export type ProviderKeyRow = {
  slug: string;
  api_key_ciphertext: string | null;
  api_key_nonce: string | null;
};

function envKeyForProvider(slug: string, env: ProviderKeyEnv): string | undefined {
  if (slug === "openrouter") return env.OPENROUTER_API_KEY || undefined;
  if (slug === "groq") return env.GROQ_API_KEY || undefined;
  return env.OPENROUTER_API_KEY || env.GROQ_API_KEY || undefined;
}

export function apiKeyForProvider(
  provider: ProviderKeyRow,
  wrappingKey: string | undefined,
  env: ProviderKeyEnv
): string | null {
  if (provider.api_key_ciphertext && provider.api_key_nonce && wrappingKey) {
    try {
      return decryptSecret(provider.api_key_ciphertext, provider.api_key_nonce, wrappingKey);
    } catch {
      // fall through to env
    }
  }
  return envKeyForProvider(provider.slug, env) || null;
}

export async function fetchProviderModels(input: {
  baseUrl: string;
  apiKey: string;
  slug: string;
  fetchImpl?: typeof fetch;
}): Promise<CatalogModel[]> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const base = input.baseUrl.replace(/\/$/, "");
  const response = await fetchImpl(`${base}/models`, {
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new CatalogError(text.slice(0, 200) || `Provider HTTP ${response.status}`, 502);
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new CatalogError("unexpected models payload", 502);
  }
  return toCatalogModels(json, input.slug);
}

export async function loadProviderCatalog(
  provider: (ProviderKeyRow & { id: string; base_url: string }) | null,
  opts: { wrappingKey?: string; env: ProviderKeyEnv; fetchImpl?: typeof fetch }
): Promise<{ providerId: string; models: CatalogModel[] }> {
  if (!provider) throw new CatalogError("Provider not found", 404);
  const apiKey = apiKeyForProvider(provider, opts.wrappingKey, opts.env);
  if (!apiKey) {
    throw new CatalogError("No API key configured for this provider", 400);
  }
  const models = await fetchProviderModels({
    baseUrl: provider.base_url,
    apiKey,
    slug: provider.slug,
    fetchImpl: opts.fetchImpl,
  });
  return { providerId: provider.id, models };
}
