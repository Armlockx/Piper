<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:commit-rules -->
# Git commits

Follow **Conventional Commits** as enforced by Commitlint + Husky.

- Spec & examples: [CONTRIBUTING.md](CONTRIBUTING.md)
- Cursor rule (always on): [.cursor/rules/commits.mdc](.cursor/rules/commits.mdc)
- Config: [commitlint.config.mjs](commitlint.config.mjs)

When the user asks you to commit: draft a message that passes `npx commitlint`, use a HEREDOC, and never skip hooks unless explicitly requested.
<!-- END:commit-rules -->
