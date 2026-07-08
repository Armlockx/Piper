# Auth

## Goal

Email/password signup and login with **immediate access** (no mandatory email confirmation). Optional email verification unlocks a **verified** badge.

## User stories

- As a visitor, I can sign up with email and password and use Piper right away
- As a user, I can log in and stay signed in via cookies
- As a new user, I get a profile with auto-generated handle from my email
- As a user, I can optionally verify my email to get a verified badge
- As a viewer, I see a verified badge on profiles and posts of verified users

## Supabase Dashboard (required)

**Authentication → Providers → Email:**

| Setting | Value |
|---------|--------|
| Enable Email provider | ON |
| **Confirm email** | **OFF** |
| Secure email change | ON (recommended) |

**Authentication → URL Configuration:**

- Site URL: your app URL (`http://localhost:3000` or Vercel domain)
- Redirect URLs must include:
  - `http://localhost:3000/**`
  - `http://localhost:3000/auth/verify`
  - `https://YOUR_DOMAIN.vercel.app/**`
  - `https://YOUR_DOMAIN.vercel.app/auth/verify`

Why Confirm email OFF: Supabase has no native “send email but allow login”. Piper stores verification in `profiles.email_verified_at` instead of relying on `auth.users.email_confirmed_at`.

## DB / API

| Piece | Location |
|-------|----------|
| Auth provider | Supabase Auth |
| Profile bootstrap | `handle_new_user()` trigger on `auth.users` |
| Verification columns | `profiles.email_verified_at`, `profiles.verification_sent_at` (migration 005) |
| Send optional email | `POST /api/auth/verify/send` → `signInWithOtp` magic link |
| Verify callback | `GET /auth/verify` → OTP/code exchange → set `email_verified_at` |
| Session refresh | `middleware.ts` + `@supabase/ssr` |

## UI

| Route / Component | Role |
|-------------------|------|
| `/login` | Email + password; friendly error if Confirm email still ON |
| `/signup` | Creates account, redirects to feed, fires optional verify email |
| `/settings/profile` | Verification banner + resend button |
| `VerifiedBadge` | Shown on profile + PostCard when `email_verified_at` is set |
| Bots | Never show verified badge |

## Steps to implement

1. ✅ Confirm email OFF in Dashboard + `config.toml`
2. ✅ Migration 005 + types
3. ✅ `sendVerificationEmail` + rate-limit (60s)
4. ✅ `/auth/verify` callback
5. ✅ Signup + settings UX
6. ✅ VerifiedBadge on profile and posts

## Test checklist

- [ ] Sign up → enters feed **without** clicking email
- [ ] Optional verification email arrives
- [ ] Click link → `email_verified_at` set → badge on profile and posts
- [ ] Resend respects 60s rate-limit
- [ ] Already verified cannot resend / shows permanent badge
- [ ] Bots do **not** show verified badge
- [ ] Login with Confirm email still ON shows helpful error message
