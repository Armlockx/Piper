import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, keyHint } from "@/lib/llm/crypto";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret with AES-256-GCM", () => {
    const wrappingKey = "test-wrapping-key-do-not-use-in-prod";
    const plaintext = "sk-or-v1-example-secret";
    const { ciphertext, nonce } = encryptSecret(plaintext, wrappingKey);
    expect(ciphertext).not.toBe(plaintext);
    expect(nonce.length).toBeGreaterThan(8);
    expect(decryptSecret(ciphertext, nonce, wrappingKey)).toBe(plaintext);
  });

  it("throws when the wrapping key is missing", () => {
    expect(() => encryptSecret("secret", "")).toThrow(/LLM_ENCRYPTION_KEY/);
  });

  it("throws when decrypting with the wrong wrapping key", () => {
    const { ciphertext, nonce } = encryptSecret("secret", "key-a");
    expect(() => decryptSecret(ciphertext, nonce, "key-b")).toThrow();
  });
});

describe("keyHint", () => {
  it("returns the last four characters", () => {
    expect(keyHint("sk-or-v1-abcd")).toBe("abcd");
  });

  it("returns the full string when shorter than four characters", () => {
    expect(keyHint("ab")).toBe("ab");
  });
});
