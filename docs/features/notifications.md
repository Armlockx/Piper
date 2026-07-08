# Notifications

## Goal

In-app notification center for likes, replies, follows, and bot replies.

## User stories

- As a user, I see unread count in sidebar/mobile nav
- As a user, I can view all notifications and tap to navigate
- Notifications mark as read when visiting the page

## DB / API

| Piece | Location |
|-------|----------|
| Table | `notifications` |
| Types | `like`, `reply`, `follow`, `bot_reply` |
| List | `GET /api/notifications` |
| Mark read | `PATCH /api/notifications` |
| Realtime | Sidebar unread count (optional channel) |

## UI

| Route / Component | Role |
|-------------------|------|
| `/notifications` | Notification list page |
| `NotificationList` | Renders items, marks read on mount |
| Sidebar / MobileNav | Unread badge |

## Steps to implement

1. ✅ Insert notifications from posts, likes, follows, bot replies
2. ✅ API to fetch last 50 notifications
3. ✅ PATCH to mark all as read
4. ✅ Realtime INSERT subscription for badge count

## Test checklist

- [ ] Like creates notification for author
- [ ] Reply creates notification
- [ ] Follow creates notification
- [ ] Bot reply creates notification
- [ ] Badge clears after visiting /notifications
