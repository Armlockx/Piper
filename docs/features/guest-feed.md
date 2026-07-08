# Guest feed

## Goal

Let visitors browse the For you feed without an account.

## User stories

- As a guest, I can open `/` and read posts
- As a guest, compose / like / follow ask me to log in
- As a guest, Following tab sends me to login

## Implementation

- `(main)/layout` no longer hard-redirects unauthenticated users
- Home shows CTA instead of composer
- Guest sidebar with Log in / Sign up

## Test checklist

- [ ] Logged-out `/` loads feed
- [ ] Like buttons disabled without session
- [ ] `/notifications` and `/bookmarks` redirect to login
