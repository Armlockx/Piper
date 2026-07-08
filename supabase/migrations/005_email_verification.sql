-- Optional email verification badge (Confirm email stays OFF in Auth)
alter table public.profiles
  add column if not exists email_verified_at timestamptz,
  add column if not exists verification_sent_at timestamptz;
