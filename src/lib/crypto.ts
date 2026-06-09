// Encrypt/decrypt the Google refresh token at rest.
//
// Server-only. The token is encrypted with AES-256-GCM using TOKEN_ENC_KEY and
// stored in profiles.google_refresh_token_enc; it is NEVER sent to the client.
//
// TOKEN_ENC_KEY must be 32 bytes, provided as 64 hex chars or 44-char base64.
// Generate one with: openssl rand -hex 32

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENC_KEY;
  if (!raw) throw new Error("TOKEN_ENC_KEY is not set — see CLAUDE.md (Calendar rules)");
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENC_KEY must decode to 32 bytes (64 hex chars or base64)");
  }
  return key;
}

/** Encrypt a plaintext token → "iv:tag:ciphertext" (all base64). */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

/** Decrypt a value produced by encryptToken. Throws if tampered or malformed. */
export function decryptToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted token");
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
