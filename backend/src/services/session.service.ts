import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { generateToken, hashToken } from "../lib/tokens.js";

/**
 * Session lifecycle. A session is an opaque bearer token whose SHA-256
 * hash is stored in `Session`. Tokens expire after `SESSION_TTL_HOURS`
 * and can be revoked individually or all at once.
 */

export type IssuedSession = {
  /** The raw token — returned to the client exactly once. */
  token: string;
  sessionId: string;
  expiresAt: Date;
};

function ttlFromNow(): Date {
  return new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);
}

export async function createSession(
  userId: string,
  userAgent?: string | null,
): Promise<IssuedSession> {
  const token = generateToken();
  const expiresAt = ttlFromNow();
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      userAgent: userAgent?.slice(0, 255) ?? null,
      expiresAt,
    },
  });
  return { token, sessionId: session.id, expiresAt };
}
