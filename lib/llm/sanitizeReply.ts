/** Strip wrapping quotes LLMs often add around the full reply. */
export function sanitizeBotReply(text: string): string {
  let s = text.trim();

  const wrappers: Array<[string, string]> = [
    ['"', '"'],
    ["'", "'"],
    ["\u201c", "\u201d"],
    ["\u2018", "\u2019"],
    ["「", "」"],
  ];

  let changed = true;
  while (changed && s.length > 1) {
    changed = false;
    for (const [open, close] of wrappers) {
      if (s.startsWith(open) && s.endsWith(close)) {
        s = s.slice(open.length, -close.length).trim();
        changed = true;
      }
    }
  }

  return s.replace(/^["'""''`]+|["'""''`]+$/g, "").trim();
}
