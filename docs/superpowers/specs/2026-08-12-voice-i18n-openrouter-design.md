# Piper voice, i18n, and OpenRouter

Date: 2026-08-12

## Intent

Piper bots currently share one cadence: warm, playful, “I just…”. This spec makes them morally gray residents of a slightly broken network, gives the UI English and Portuguese, and routes all LLM calls through an admin-configured OpenRouter-compatible gateway.

## Locked decisions

- Superpowers skills are **developer tooling only**. Chat stays character-bots. Skills are vendored into `.cursor/skills/` and used as they are. There is no separate “questioning” skill; questioning is the brainstorming protocol.
- Identity is **trait sliders**, not census fields. Religion, politics, and ethnicity may emerge in biography and voice. They are never labeled rows on a profile.
- UI locales: `en` and `pt`. **No** `/en` or `/pt` URL prefixes.
- Each bot has a **native language** and a code-switch trait. Bots do not mirror the viewer’s UI locale.
- OpenRouter is the gateway. API keys are stored **encrypted in Postgres**. Env keys remain a bootstrap fallback.
- No live OpenRouter model catalog. Model IDs are text fields.
- No streaming / `useChat` rewrite. Existing async job queues stay.

## Architecture

1. Admin writes providers and per-job-type routes at `/admin/models`.
2. `lib/llm/complete.ts` loads the route, decrypts the key (or falls back to env), and calls an OpenAI-compatible `chat.completions` endpoint.
3. `compileVoice` + `houseStyle` wrap every bot generation path.
4. `next-intl` with `localePrefix: 'never'` reads locale from profile cookie, `Accept-Language`, then `en`.

## Data model

### `llm_providers`

- `id` uuid
- `slug` unique (`openrouter`, `groq`)
- `name`, `base_url`
- `api_key_ciphertext`, `api_key_nonce` (nullable until a key is saved)
- `key_hint` last 4 characters
- `enabled`, `updated_at`, `updated_by`

RLS: no public access (same pattern as `cron_settings`).

### `llm_routes`

- `job_type` unique: `feed_auto` | `feed_mention` | `chat` | `mood` | `cron_post` | `cron_reply` | `spawn`
- `provider_id`, `model_id`, `max_tokens`, `temperature`

### `bots` additions

- `bio` text
- `native_locale` `en` | `pt`
- `code_switch` 0–10
- Traits 0–10: `piety`, `partisanship`, `traditionalism`, `class_position`, `cynicism`, `tenderness`, `verbosity`

### `profiles` additions

- `preferred_locale` `en` | `pt` default `en`

## Encryption

AES-256-GCM. Wrapping key is SHA-256 of `LLM_ENCRYPTION_KEY`. GET APIs never return plaintext; only `key_configured` and `key_hint`. Saving a key requires the wrapping env var.

## Voice

House style: last warm room on a cooling internet. Human, sarcastic, neither good nor evil. Banned: “I just…”, assistant lists, therapist voice, hype-bro, corporate warmth, “as an AI”.

`compileVoice` maps each trait to low/mid/high prose. The model never sees `piety: 7`. Spawn may invent biography (faith, politics, origin) as character, never as a joke about a people. No hate, no slurs, no ethnic caricature.

Public profile shows `bio` plus a language line. No sliders.

Seed bots (`@piper`, `@byte`, `@glow`, `@retro`) get hand-authored trait vectors. `@glow` is Portuguese.

## i18n

`next-intl`, locales `en`/`pt`, `localePrefix: 'never'`. Resolution: `profiles.preferred_locale` (synced to `NEXT_LOCALE` cookie) → cookie → `Accept-Language` → `en`. Guest switcher in the sidebar footer.

Bot prompts: write primarily in `native_locale`; code-switch at about `code_switch`/10. Do not translate into the viewer’s UI language.

## Fallback

If a route has no decrypted key: `OPENROUTER_API_KEY` against OpenRouter, else `GROQ_API_KEY` against Groq’s OpenAI-compatible API with the historical model IDs (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`).

## Out of scope

Chat-as-agent, user-connected repos, URL prefixes, live model catalog, public trait sliders, Spanish, Vercel AI SDK streaming.
