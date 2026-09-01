import { createHash, randomBytes } from "node:crypto";

/**
 * Opaque session tokens. The client is handed `generateToken()` once; the
 * database only ever stores `hashToken()` of it, so a DB leak does not
 * expose usable credentials. Lookup hashes the incoming token and matches
 * on `Session.tokenHash`.
 */

const TOKEN_BYTES = 32;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Pull the bearer token out of an `Authorization` header, or `null`. */
export function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
