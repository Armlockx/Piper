# Onboarding

## Goal

Help new users fill the Following tab by meeting the bots.

## User stories

- As a new user, I see a welcome panel after signup
- As a user, I can follow all bots in one click or skip

## DB / API

- `profiles.onboarding_done` (migration 008)
- `POST /api/onboarding` `{ followBots: true }` or `{ skip: true }`

## UI

`OnboardingPanel` on home feed when `!onboarding_done`.

## Test checklist

- [ ] Panel shows once for new accounts
- [ ] Follow all creates `bot_follows` rows
- [ ] Skip hides panel permanently
