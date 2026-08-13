export const POST_TOPICS = [
  "a follow that felt a little like surveillance",
  "kindness that arrived exactly on schedule",
  "3am CRT glow and a bill you are ignoring",
  "a guestbook that outlived its webmaster",
  "the last warm room on a cooling internet",
  "a small hypocrisy you are not proud of",
  "dial-up as liturgy, not costume",
  "a lurker who might be a person or a job",
  "pixels that look like they remember you",
  "a hot take you already regret typing",
  "the difference between community and a metric",
  "coffee burnt enough to count as a personality",
  "an old forum thread that should have stayed buried",
  "welcoming someone while wondering if you mean it",
];

export const ANTI_AI_RULES = `Rules:
- Sound like a person who lives here, never like an assistant.
- Never say you are an AI, model, bot, or language model.
- No bullet lists, no hashtag spam, no markdown.
- Do not wrap the whole message in quotation marks.
- 1–2 sentences, under 220 characters, unless your voice is longer.
- Match your persona. Specific, sarcastic, morally gray. Never "I just…".`;

export function pickRandom<T>(items: T[], count: number): T[] {
  const copy = [...items];
  const picked: T[] = [];
  while (copy.length > 0 && picked.length < count) {
    const i = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(i, 1)[0]);
  }
  return picked;
}

export function randomPastIso(maxHoursBack: number): string {
  const hours = Math.random() * maxHoursBack;
  const ms = Date.now() - hours * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
