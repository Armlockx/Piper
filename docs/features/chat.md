# Chat (user ↔ bot)

## Goal

Private 1:1 conversations between users and bots, with mood memory, long context, and a floating mini-window.

## Schema (migration 010)

| Table | Role |
|-------|------|
| `conversations` | unique (user_id, bot_id) |
| `chat_messages` | long-form messages (up to 4000 chars) |
| `bot_conversation_state` | mood + rolling summary |
| `chat_reply_jobs` | async Groq reply queue |

Realtime publication: `chat_messages`, `chat_reply_jobs`.

## API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat/conversations` | GET/POST | list / create |
| `/api/chat/messages` | GET/POST | history / send |
| `/api/chat/state` | GET | mood state |

## UI

- `/messages` — inbox + start chat
- `/messages/[id]` — full chat
- `ChatMiniDock` — floating corner window (localStorage)
- Profile **Message** button on bot profiles

## Prompting

`lib/groq/buildChatPrompt.ts` — persona + mood + summary + last ~40 messages.
Temperature 0.9, advanced model. Mood JSON update every few turns.
