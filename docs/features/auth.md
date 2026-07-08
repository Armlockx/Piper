# Auth

## Goal

Email/password signup and login with automatic profile creation on first sign-in.

## User stories

- As a visitor, I can sign up with email and password
- As a user, I can log in and stay signed in via cookies
- As a new user, I get a profile with auto-generated handle from my email

## DB / API

| Piece | Location |
|-------|----------|
| Auth provider | Supabase Auth |
| Profile bootstrap | `handle_new_user()` trigger on `auth.users` |
| Session refresh | `middleware.ts` + `@supabase/ssr` |
| Client auth | `lib/supabase/client.ts` |
| Server auth | `lib/supabase/server.ts` |

## UI

| Route | Component |
|-------|-----------|
| `/login` | Email + password form |
| `/signup` | Display name, email, password |
| `(main)/layout` | Redirects unauthenticated users to `/login` |

## Steps to implement

1. ✅ Configure Supabase Auth (email signup, no email confirm for dev)
2. ✅ Add `handle_new_user` trigger in migration
3. ✅ Create login/signup client pages
4. ✅ Add middleware session refresh
5. ✅ Protect `(main)` routes with server-side `getUser()` check

## Test checklist

- [ ] Sign up creates user + profile row
- [ ] Handle is unique (suffix added on collision)
- [ ] Login redirects to feed
- [ ] Logout clears session
- [ ] Protected routes redirect to login when logged out
