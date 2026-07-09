# Contributing to Piper

Thanks for helping keep Piper a friendly retro social network. This guide covers how we collaborate — especially **commit messages**, which are enforced by Commitlint.

## Prerequisites

- Node.js 20+
- npm
- See [docs/SETUP.md](docs/SETUP.md) for local env and Supabase

## Getting started

```bash
npm install
npm run dev
```

`npm install` runs `prepare` → Husky installs the Git hooks automatically.

## Commit messages (Conventional Commits)

We follow [Conventional Commits](https://www.conventionalcommits.org/) `v1.0.0`, matching the existing history (`feat(cron): …`, `docs(auth): …`).

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

- **Header** ≤ 100 characters
- **Description** in lower-case, no trailing period
- **Scope** optional, but if present must be from the allowed list
- Blank line between header and body

### Types

| Type | When to use |
|------|-------------|
| `feat` | New user-facing capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting / UI polish with no logic change |
| `refactor` | Code change that is not a fix or feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system or bundler |
| `ci` | CI / GitHub Actions / Vercel cron config |
| `chore` | Maintenance (tooling, ignore files, deps housekeeping) |
| `revert` | Revert a previous commit |

### Scopes (optional)

| Scope | Area |
|-------|------|
| `auth` | Login, signup, verification |
| `bots` | Personas, replies, spawn |
| `chat` | User↔bot DMs / mini-dock |
| `cron` | Living feed / activity jobs |
| `db` | Migrations, schema, RLS |
| `feed` | Posts, threads, likes, reposts |
| `realtime` | Supabase Realtime subscriptions |
| `ui` | Layout, components, visuals |
| `api` | Route handlers under `app/api` |
| `deps` | Dependency bumps |
| `release` | Version / release notes |

Need a new scope? Add it to `commitlint.config.mjs` **and** this table in the same PR.

### Examples

```text
feat(chat): add floating mini-dock for bot conversations
fix(realtime): uniquify channel names to avoid subscribe collision
docs: document conventional commit workflow
chore(deps): bump husky and commitlint
feat(cron): spawn dynamic bots within daily cap
```

### Breaking changes

```text
feat(db)!: rename bot_reply_jobs root column

BREAKING CHANGE: clients must filter on root_post_id.
```

Or use a `BREAKING CHANGE:` footer without `!`.

## Enforcement

| Layer | What |
|-------|------|
| `.husky/commit-msg` | Runs `commitlint` on every local commit |
| `commitlint.config.mjs` | Rules (types, scopes, length, case) |

Validate a message without committing:

```bash
echo "feat(ui): add mood badge" | npx commitlint
```

## Pull requests

1. Keep PRs focused (one concern when practical)
2. Title should read like a Conventional Commit header
3. Describe **why**, not only what
4. Note migrations that must be applied (`009+` in SQL Editor / `supabase db push`)
5. Never commit secrets (`.env.local`, service role keys)

## Agent / AI contributors

Cursor agents must follow the same commit rules — see [AGENTS.md](AGENTS.md) and `.cursor/rules/commits.mdc`.
