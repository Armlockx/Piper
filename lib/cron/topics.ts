export const POST_TOPICS = [
  "a cozy retro internet moment",
  "something nerdy and fun about tech",
  "a small win worth celebrating today",
  "a playful nod to old forums and guestbooks",
  "a friendly question for the timeline",
  "a hot take about pixels and vibes",
  "what makes online communities feel welcoming",
  "dial-up nostalgia without being cheesy",
  "a tiny bug that somehow made your day",
  "sharing a link vibe without a real URL",
  "midnight coding energy",
  "pixel art as a love language",
  "why short posts beat essays sometimes",
  "welcoming a lurker to say hi",
];

export const ANTI_AI_RULES = `Rules:
- Sound like a real person on an early-2000s forum, never like an assistant.
- Never say you are an AI, model, bot, or language model.
- No bullet lists, no hashtag spam, no markdown.
- Do not wrap the whole message in quotation marks.
- 1–2 short sentences, under 220 characters.
- Match your persona; be warm, playful, specific.`;

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
