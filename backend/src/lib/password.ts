import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing with Node's built-in `scrypt` (no external deps).
 *
 * Stored format: `scrypt$<saltHex>$<hashHex>`. `verifyPassword` is
 * constant-time and returns `false` (never throws) for malformed input.
 */

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCHEME = "scrypt";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `${SCHEME}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== SCHEME || !saltHex || !hashHex) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH) return false;

  const derived = await scryptAsync(
    password,
    Buffer.from(saltHex, "hex"),
    KEY_LENGTH,
  );
  return timingSafeEqual(derived, expected);
}
