/**
 * Authenticated symmetric encryption for the small secrets we must store
 * at rest (Google OAuth access / refresh tokens). AES-256-GCM with a
 * random 96-bit IV per message; output is a self-describing string:
 *
 *   v1.<iv b64>.<tag b64>.<ciphertext b64>
 *
 * The key comes from `GOOGLE_TOKEN_ENC_KEY` (32 bytes, base64 or hex).
 * It's read from `process.env` lazily — not through `config/env.ts` — so
 * tests can set it before importing and so a missing key only breaks the
 * Google feature, not boot.
 */

import crypto from "node:crypto";

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.GOOGLE_TOKEN_ENC_KEY;
  if (!raw) {
    throw new Error(
      "GOOGLE_TOKEN_ENC_KEY is not set — Google token encryption unavailable",
    );
  }
  const buf = /^[0-9a-fA-F]{64}$/.test(raw.trim())
    ? Buffer.from(raw.trim(), "hex")
    : Buffer.from(raw.trim(), "base64");
  if (buf.length !== 32) {
    throw new Error(
      "GOOGLE_TOKEN_ENC_KEY must decode to exactly 32 bytes (256-bit key)",
    );
  }
  cachedKey = buf;
  return buf;
}

/** For tests: forget the cached key so a changed env var takes effect. */
export function resetSecretBoxKey(): void {
  cachedKey = null;
}

export function seal(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(".");
}

export function open(blob: string): string {
  const parts = blob.split(".");
  const [version, ivB64, tagB64, dataB64] = parts;
  if (parts.length !== 4 || version !== "v1" || !ivB64 || !tagB64) {
    throw new Error("secret-box: malformed sealed value");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
