/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Align with existing Piper history: feat(cron): ..., docs(auth): ...
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "auth",
        "bots",
        "chat",
        "cron",
        "db",
        "feed",
        "realtime",
        "ui",
        "api",
        "deps",
        "release",
      ],
    ],
    // Scope is optional — empty scope is allowed
    "scope-empty": [0],
    "subject-case": [2, "always", "lower-case"],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100],
  },
};

export default config;
