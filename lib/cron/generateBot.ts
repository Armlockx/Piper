import { createGroqClient, runGroqChatCompletion } from "@/lib/groq/client";
import type { ChatTurn } from "@/lib/groq/client";

export type GeneratedBotSpec = {
  handle: string;
  name: string;
  persona_prompt: string;
  accent_color: string;
  archetype: string;
  auto_reply_weight: number;
};

const ACCENT_PALETTE = [
  "#00ffd5",
  "#ff006e",
  "#ffbe0b",
  "#8338ec",
  "#39ff14",
  "#00bfff",
  "#ff6b35",
  "#e0aaff",
];

function sanitizeHandle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

function parseBotJson(raw: string): GeneratedBotSpec | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    const handle = sanitizeHandle(String(obj.handle ?? ""));
    const name = String(obj.name ?? "").trim().slice(0, 40);
    const persona_prompt = String(obj.persona_prompt ?? "").trim().slice(0, 600);
    const archetype = String(obj.archetype ?? "wanderer")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 40);
    let accent_color = String(obj.accent_color ?? "").trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(accent_color)) {
      accent_color = ACCENT_PALETTE[Math.floor(Math.random() * ACCENT_PALETTE.length)];
    }
    if (handle.length < 2 || !name || persona_prompt.length < 40) return null;
    const weight = Math.min(5, Math.max(1, Number(obj.auto_reply_weight) || 2));
    return {
      handle,
      name,
      persona_prompt,
      accent_color,
      archetype,
      auto_reply_weight: weight,
    };
  } catch {
    return null;
  }
}

/** Pixel-face SVG data URL using accent color + initials. */
export function buildBotAvatarDataUrl(name: string, accent: string): string {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="#0a0a0f"/>
  <rect x="12" y="12" width="40" height="40" fill="${accent}"/>
  <rect x="20" y="22" width="6" height="6" fill="#0a0a0f"/>
  <rect x="38" y="22" width="6" height="6" fill="#0a0a0f"/>
  <rect x="24" y="38" width="16" height="3" fill="#0a0a0f"/>
  <text x="32" y="58" text-anchor="middle" font-size="8" fill="${accent}" font-family="monospace">${initials}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function generateBotPersona(existingHandles: string[], existingArchetypes: string[]) {
  const messages: ChatTurn[] = [
    {
      role: "system",
      content: `You invent a new friendly persona for Piper, a retro early-web social network.
Reply with ONLY valid JSON (no markdown):
{"handle":"2-20 chars lowercase alphanumeric underscore","name":"display name","archetype":"snake_case vibe label","persona_prompt":"2-4 sentences of personality for an LLM system prompt — never say AI/bot/model","accent_color":"#RRGGBB","auto_reply_weight":1-5}

Rules:
- Distinct from existing handles: ${existingHandles.slice(0, 40).join(", ") || "(none)"}
- Avoid repeating archetypes: ${existingArchetypes.slice(0, 30).join(", ") || "(none)"}
- Retro / pixel / dial-up / forum / guestbook energy
- Warm, creative, interactive — not corporate`,
    },
    {
      role: "user",
      content: "Invent one new Piper persona now.",
    },
  ];

  // Prefer structured JSON; fall back to free completion parse
  try {
    const client = createGroqClient();
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      max_tokens: 400,
      temperature: 1.0,
      response_format: { type: "json_object" },
    });
    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseBotJson(raw);
    if (parsed && !existingHandles.includes(parsed.handle)) return parsed;
  } catch {
    /* fall through */
  }

  const { raw } = await runGroqChatCompletion(messages, "default", {
    maxTokens: 400,
    temperature: 1.0,
  });
  const parsed = parseBotJson(raw);
  if (parsed && !existingHandles.includes(parsed.handle)) return parsed;
  return null;
}
