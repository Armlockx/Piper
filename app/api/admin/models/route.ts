import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/isAdmin";
import { getLlmAdminConfig, updateLlmProvider, upsertLlmRoute } from "@/lib/llm/admin";

const jobTypes = [
  "feed_auto",
  "feed_mention",
  "chat",
  "mood",
  "cron_post",
  "cron_reply",
  "spawn",
] as const;

const patchSchema = z.object({
  providers: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(80).optional(),
        base_url: z.string().url().optional(),
        enabled: z.boolean().optional(),
        api_key: z.string().max(512).optional(),
      })
    )
    .optional(),
  routes: z
    .array(
      z.object({
        job_type: z.enum(jobTypes),
        provider_id: z.string().uuid(),
        model_id: z.string().min(1).max(120),
        max_tokens: z.coerce.number().int().min(16).max(8192),
        temperature: z.coerce.number().min(0).max(2),
      })
    )
    .optional(),
});

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const config = await getLlmAdminConfig();
    return NextResponse.json(config);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    for (const provider of parsed.data.providers ?? []) {
      await updateLlmProvider(
        provider.id,
        {
          name: provider.name,
          base_url: provider.base_url,
          enabled: provider.enabled,
          api_key: provider.api_key,
        },
        auth.user.id
      );
    }
    for (const route of parsed.data.routes ?? []) {
      await upsertLlmRoute(route);
    }
    const config = await getLlmAdminConfig();
    return NextResponse.json(config);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
