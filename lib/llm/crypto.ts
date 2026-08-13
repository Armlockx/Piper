import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function wrappingKeyBytes(wrappingKey: string): Buffer {
  if (!wrappingKey) {
    throw new Error("LLM_ENCRYPTION_KEY is required to encrypt or decrypt provider keys");
  }
  return createHash("sha256").update(wrappingKey, "utf8").digest();
}

export function encryptSecret(plaintext: string, wrappingKey: string): { ciphertext: string; nonce: string } {
  const key = wrappingKeyBytes(wrappingKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
    nonce: iv.toString("base64"),
  };
}

export function decryptSecret(ciphertext: string, nonce: string, wrappingKey: string): string {
  const key = wrappingKeyBytes(wrappingKey);
  const packed = Buffer.from(ciphertext, "base64");
  if (packed.length <= AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext");
  }
  const encrypted = packed.subarray(0, packed.length - AUTH_TAG_LENGTH);
  const tag = packed.subarray(packed.length - AUTH_TAG_LENGTH);
  const iv = Buffer.from(nonce, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function keyHint(plaintext: string): string {
  return plaintext.slice(-4);
}
