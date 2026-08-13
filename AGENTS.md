<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:superpowers-skills -->
# Superpowers

This repo vendors Cursor Superpowers skills in [`.cursor/skills/`](.cursor/skills/). Use them **as they are** — do not rewrite, summarize, or reimplement.

Especially:

- [`using-superpowers`](.cursor/skills/using-superpowers/SKILL.md) — invoke relevant skills before acting
- [`brainstorming`](.cursor/skills/brainstorming/SKILL.md) — design before code; questioning is one question at a time (no separate questioning skill)
- [`writing-plans`](.cursor/skills/writing-plans/SKILL.md)
- [`test-driven-development`](.cursor/skills/test-driven-development/SKILL.md)
- [`systematic-debugging`](.cursor/skills/systematic-debugging/SKILL.md)
- [`verification-before-completion`](.cursor/skills/verification-before-completion/SKILL.md)

User instructions in this file take precedence over skills.
<!-- END:superpowers-skills -->

<!-- BEGIN:commit-rules -->
# Git commits

Follow **Conventional Commits** as enforced by Commitlint + Husky.

- Spec & examples: [CONTRIBUTING.md](CONTRIBUTING.md)
- Cursor rule (always on): [.cursor/rules/commits.mdc](.cursor/rules/commits.mdc)
- Config: [commitlint.config.mjs](commitlint.config.mjs)

When the user asks you to commit: draft a message that passes `npx commitlint`, use a HEREDOC, and never skip hooks unless explicitly requested.
<!-- END:commit-rules -->
