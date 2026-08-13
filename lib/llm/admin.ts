import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, keyHint } from "@/lib/llm/crypto";
import type { LlmJobType } from "@/lib/llm/resolve";
import type { LlmProviderPublic, LlmRoute } from "@/lib/types/database";

export type LlmAdminPayload = {
  providers: LlmProviderPublic[];
  routes: LlmRoute[];
};

function toPublic(row: {
  id: string;
  slug: string;
  name: string;
  base_url: string;
  key_hint: string | null;
  api_key_ciphertext: string | null;
  enabled: boolean;
  updated_at: string;
}): LlmProviderPublic {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    base_url: row.base_url,
    enabled: row.enabled,
    key_configured: Boolean(row.api_key_ciphertext),
    key_hint: row.key_hint,
    updated_at: row.updated_at,
  };
}

export async function getLlmAdminConfig(): Promise<LlmAdminPayload> {
  const admin = createAdminClient();
  const [{ data: providers, error: pErr }, { data: routes, error: rErr }] = await Promise.all([
    admin
      .from("llm_providers")
      .select("id, slug, name, base_url, key_hint, api_key_ciphertext, enabled, updated_at")
      .order("slug"),
    admin.from("llm_routes").select("job_type, provider_id, model_id, max_tokens, temperature").order("job_type"),
  ]);

  if (pErr) throw pErr;
  if (rErr) throw rErr;

  return {
    providers: (providers ?? []).map(toPublic),
    routes: (routes ?? []).map((r) => ({
      job_type: r.job_type as LlmRoute["job_type"],
      provider_id: r.provider_id,
      model_id: r.model_id,
      max_tokens: Number(r.max_tokens),
      temperature: Number(r.temperature),
    })),
  };
}

export async function updateLlmProvider(
  id: string,
  patch: {
    name?: string;
    base_url?: string;
    enabled?: boolean;
    api_key?: string;
  },
  updatedBy: string
) {
  const admin = createAdminClient();
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.base_url !== undefined) row.base_url = patch.base_url.replace(/\/$/, "");
  if (patch.enabled !== undefined) row.enabled = patch.enabled;

  if (patch.api_key !== undefined && patch.api_key.trim()) {
    const wrappingKey = process.env.LLM_ENCRYPTION_KEY;
    if (!wrappingKey) {
      throw new Error("LLM_ENCRYPTION_KEY is required to save a provider key");
    }
    const { ciphertext, nonce } = encryptSecret(patch.api_key.trim(), wrappingKey);
    row.api_key_ciphertext = ciphertext;
    row.api_key_nonce = nonce;
    row.key_hint = keyHint(patch.api_key.trim());
  }

  const { error } = await admin.from("llm_providers").update(row).eq("id", id);
  if (error) throw error;
}

export async function upsertLlmRoute(
  route: {
    job_type: LlmJobType;
    provider_id: string;
    model_id: string;
    max_tokens: number;
    temperature: number;
  }
) {
  const admin = createAdminClient();
  const { error } = await admin.from("llm_routes").upsert(
    {
      job_type: route.job_type,
      provider_id: route.provider_id,
      model_id: route.model_id.trim(),
      max_tokens: route.max_tokens,
      temperature: route.temperature,
    },
    { onConflict: "job_type" }
  );
  if (error) throw error;
}
