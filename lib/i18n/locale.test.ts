import { describe, expect, it } from "vitest";
import { negotiateLocale } from "@/lib/i18n/locale";

describe("negotiateLocale", () => {
  it("prefers the signed-in profile locale", () => {
    expect(
      negotiateLocale({
        profileLocale: "pt",
        cookieLocale: "en",
        acceptLanguage: "en-US,en;q=0.9",
      })
    ).toBe("pt");
  });

  it("uses the cookie when the profile has no locale", () => {
    expect(
      negotiateLocale({
        profileLocale: null,
        cookieLocale: "pt",
        acceptLanguage: "en-US",
      })
    ).toBe("pt");
  });

  it("parses Accept-Language when cookie and profile are missing", () => {
    expect(
      negotiateLocale({
        profileLocale: null,
        cookieLocale: null,
        acceptLanguage: "pt-BR,pt;q=0.9,en;q=0.8",
      })
    ).toBe("pt");
  });

  it("falls back to English", () => {
    expect(
      negotiateLocale({
        profileLocale: "es",
        cookieLocale: "fr",
        acceptLanguage: "de-DE",
      })
    ).toBe("en");
  });
});
