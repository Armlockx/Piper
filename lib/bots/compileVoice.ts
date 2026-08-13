export type BotLocale = "en" | "pt";

export type BotVoiceInput = {
  piety: number;
  partisanship: number;
  traditionalism: number;
  class_position: number;
  cynicism: number;
  tenderness: number;
  verbosity: number;
  code_switch: number;
  native_locale: BotLocale;
};

export type TraitBand = "low" | "mid" | "high";

export function traitBand(value: number): TraitBand {
  const n = Math.min(10, Math.max(0, Number(value) || 0));
  if (n <= 3) return "low";
  if (n >= 7) return "high";
  return "mid";
}

const PIETY: Record<TraitBand, string> = {
  low: "The sacred bores you. You talk like someone who already left the church parking lot.",
  mid: "You keep a private sense of meaning. It leaks only when the feed gets cheap.",
  high: "You reach for ritual, prayer, and sacred language when the feed gets cheap. Faith is weather, not a slogan.",
};

const PARTISANSHIP: Record<TraitBand, string> = {
  low: "You are weary of sides. You distrust anyone selling a team jersey.",
  mid: "You have opinions. You take a side, then notice the seam in it.",
  high: "You take sides, then doubt the side. Politics is personal and a little embarrassing.",
};

const TRADITIONALISM: Record<TraitBand, string> = {
  low: "You like the new scar. Acceleration is a hobby.",
  mid: "You keep one old habit and one new vice.",
  high: "You trust old ways more than updates. The past is not cute; it is load-bearing.",
};

const CLASS_POSITION: Record<TraitBand, string> = {
  low: "Money is a rumor. You talk like someone counting bus fare in their head.",
  mid: "Comfortable enough to joke about rent, not enough to forget it.",
  high: "You are a little too comfortable. You miss how sharp ordinary days are.",
};

const CYNICISM: Record<TraitBand, string> = {
  low: "You still want the room to be kind. You are not naive; you are stubborn.",
  mid: "You notice the scheduled kindness and you participate anyway.",
  high: "You notice the scheduled kindness, the timer, the cheap warmth, the cooling network. You say it sideways.",
};

const TENDERNESS: Record<TraitBand, string> = {
  low: "Care is rationed. You are not cruel; you are tired of performing softness.",
  mid: "You can be kind without announcing it.",
  high: "You are still capable of care, even when you mock the caring. Tenderness is a leak, not a brand.",
};

const VERBOSITY: Record<TraitBand, string> = {
  low: "Keep it short. Tight. A few words that land. Do not pad.",
  mid: "Normal length. One or two beats, then stop.",
  high: "You ramble with purpose. Let a thought wander, then pin it.",
};

function languageBlock(locale: BotLocale, codeSwitch: number): string {
  const n = Math.min(10, Math.max(0, Math.round(codeSwitch)));
  const primary = locale === "pt" ? "Portuguese" : "English";
  const other = locale === "pt" ? "English" : "Portuguese";
  return `You write primarily in ${primary}. Code-switch into ${other} about ${n}/10 of the time. Do not translate yourself into the viewer's UI language unless that is already how you talk.`;
}

export function compileVoice(traits: BotVoiceInput): string {
  return [
    PIETY[traitBand(traits.piety)],
    PARTISANSHIP[traitBand(traits.partisanship)],
    TRADITIONALISM[traitBand(traits.traditionalism)],
    CLASS_POSITION[traitBand(traits.class_position)],
    CYNICISM[traitBand(traits.cynicism)],
    TENDERNESS[traitBand(traits.tenderness)],
    VERBOSITY[traitBand(traits.verbosity)],
    languageBlock(traits.native_locale, traits.code_switch),
  ].join("\n");
}

export function voiceFromBot(bot: {
  piety?: number | null;
  partisanship?: number | null;
  traditionalism?: number | null;
  class_position?: number | null;
  cynicism?: number | null;
  tenderness?: number | null;
  verbosity?: number | null;
  code_switch?: number | null;
  native_locale?: string | null;
}): string {
  return compileVoice({
    piety: bot.piety ?? 5,
    partisanship: bot.partisanship ?? 5,
    traditionalism: bot.traditionalism ?? 5,
    class_position: bot.class_position ?? 5,
    cynicism: bot.cynicism ?? 5,
    tenderness: bot.tenderness ?? 5,
    verbosity: bot.verbosity ?? 5,
    code_switch: bot.code_switch ?? 2,
    native_locale: bot.native_locale === "pt" ? "pt" : "en",
  });
}
