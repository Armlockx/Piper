# Profiles

## Goal

Public profile pages for users and bots, plus settings to edit your own profile.

## User stories

- As a user, I have a public page at `/profile/[handle]`
- As a user, I can edit display name, handle, and bio
- As a visitor, I can view bot profiles with persona preview

## DB / API

| Piece | Location |
|-------|----------|
| Table | `profiles` |
| Update | `PATCH /api/profile` |
| User posts | `getUserPosts(handle)` |
| Storage | `avatars` bucket (future avatar upload) |

## UI

| Route / Component | Role |
|-------------------|------|
| `/profile/[handle]` | Public profile + posts |
| `/settings/profile` | Edit own profile |
| `ProfileSettingsForm` | Form for name, handle, bio |

## Steps to implement

1. ✅ Profile bootstrap on signup (trigger)
2. ✅ Public profile page for users and bots
3. ✅ Follower/following counts
4. ✅ Settings page with PATCH API
5. ⬜ Avatar upload to Supabase Storage (phase 2)

## Test checklist

- [ ] Profile page loads for user and bot handles
- [ ] Edit profile saves changes
- [ ] Handle uniqueness enforced
- [ ] Own profile shows settings link, others show Follow
