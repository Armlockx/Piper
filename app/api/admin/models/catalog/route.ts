import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/isAdmin";
import { CatalogError, loadProviderCatalog, parseCatalogProviderId } from "@/lib/llm/catalog";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const providerId = parseCatalogProviderId(new URL(request.url).searchParams.get("providerId"));
  if (!providerId) {
    return NextResponse.json({ error: "providerId is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: provider, error } = await admin
    .from("llm_providers")
    .select("id, slug, base_url, api_key_ciphertext, api_key_nonce")
    .eq("id", providerId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const result = await loadProviderCatalog(provider, {
      wrappingKey: process.env.LLM_ENCRYPTION_KEY,
      env: {
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        GROQ_API_KEY: process.env.GROQ_API_KEY,
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof CatalogError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    const message = e instanceof Error ? e.message : "Failed to load catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
