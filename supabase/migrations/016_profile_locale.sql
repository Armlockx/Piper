-- User UI locale preference (en | pt). Cookie NEXT_LOCALE is the runtime source of truth after sync.

alter table public.profiles
  add column if not exists preferred_locale text not null default 'en'
    check (preferred_locale in ('en', 'pt'));
