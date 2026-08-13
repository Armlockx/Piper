-- LLM provider registry + per-job-type model routes. Keys are encrypted at rest (app-level AES-GCM).

create table public.llm_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  base_url text not null,
  api_key_ciphertext text,
  api_key_nonce text,
  key_hint text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table public.llm_routes (
  job_type text primary key
    check (job_type in (
      'feed_auto',
      'feed_mention',
      'chat',
      'mood',
      'cron_post',
      'cron_reply',
      'spawn'
    )),
  provider_id uuid not null references public.llm_providers(id) on delete restrict,
  model_id text not null,
  max_tokens integer not null default 280
    check (max_tokens >= 16 and max_tokens <= 8192),
  temperature numeric not null default 0.8
    check (temperature >= 0 and temperature <= 2)
);

alter table public.llm_providers enable row level security;
alter table public.llm_routes enable row level security;

create policy "No public access to llm_providers"
  on public.llm_providers for all
  using (false)
  with check (false);

create policy "No public access to llm_routes"
  on public.llm_routes for all
  using (false)
  with check (false);

insert into public.llm_providers (slug, name, base_url, enabled)
values
  ('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', true),
  ('groq', 'Groq', 'https://api.groq.com/openai/v1', true);

insert into public.llm_routes (job_type, provider_id, model_id, max_tokens, temperature)
select v.job_type, p.id, v.model_id, v.max_tokens, v.temperature
from public.llm_providers p
cross join (
  values
    ('feed_auto', 'llama-3.1-8b-instant', 280, 0.8),
    ('feed_mention', 'llama-3.3-70b-versatile', 280, 0.8),
    ('chat', 'llama-3.3-70b-versatile', 600, 0.9),
    ('mood', 'llama-3.1-8b-instant', 200, 0.4),
    ('cron_post', 'llama-3.1-8b-instant', 280, 0.8),
    ('cron_reply', 'llama-3.1-8b-instant', 280, 0.8),
    ('spawn', 'llama-3.1-8b-instant', 400, 1.0)
) as v(job_type, model_id, max_tokens, temperature)
where p.slug = 'groq';
