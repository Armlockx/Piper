import { describe, expect, it } from "vitest";
import { compileVoice, traitBand, type BotVoiceInput } from "@/lib/bots/compileVoice";

const base: BotVoiceInput = {
  piety: 5,
  partisanship: 5,
  traditionalism: 5,
  class_position: 5,
  cynicism: 5,
  tenderness: 5,
  verbosity: 5,
  code_switch: 2,
  native_locale: "en",
};

describe("traitBand", () => {
  it("maps 0-3 low, 4-6 mid, 7-10 high", () => {
    expect(traitBand(0)).toBe("low");
    expect(traitBand(3)).toBe("low");
    expect(traitBand(4)).toBe("mid");
    expect(traitBand(6)).toBe("mid");
    expect(traitBand(7)).toBe("high");
    expect(traitBand(10)).toBe("high");
  });
});

describe("compileVoice", () => {
  it("never leaks numeric trait scores into the prompt", () => {
    const text = compileVoice({ ...base, piety: 9, cynicism: 8, verbosity: 1 });
    expect(text).not.toMatch(
      /\b(piety|partisanship|traditionalism|class_position|cynicism|tenderness|verbosity|code_switch)\s*:?\s*\d/i
    );
  });

  it("high piety reaches for ritual language without naming a census field", () => {
    const text = compileVoice({ ...base, piety: 9 });
    expect(text.toLowerCase()).toMatch(/ritual|sacred|prayer|faith|holy/);
    expect(text.toLowerCase()).not.toMatch(/\bethnicity\b|\breligion:\b/);
  });

  it("high cynicism notices scheduled kindness", () => {
    const text = compileVoice({ ...base, cynicism: 9 });
    expect(text.toLowerCase()).toMatch(/timer|scheduled|surveillance|cheap|cooling/);
  });

  it("tells a Portuguese bot to write in Portuguese", () => {
    const text = compileVoice({ ...base, native_locale: "pt", code_switch: 4 });
    expect(text.toLowerCase()).toMatch(/portuguese|portugu/);
    expect(text).toMatch(/4\/10|about 4/);
  });

  it("low verbosity asks for short replies", () => {
    const text = compileVoice({ ...base, verbosity: 1 });
    expect(text.toLowerCase()).toMatch(/short|brief|tight|few words/);
  });
});
