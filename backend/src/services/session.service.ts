import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
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

export type ResolvedSession = {
  sessionId: string;
  userId: string;
};

/**
 * Resolve a raw bearer token to its live session, or `null` when the
 * token is unknown, expired, or revoked.
 */
export async function resolveSession(
  token: string,
): Promise<ResolvedSession | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!session || session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  return { sessionId: session.id, userId: session.userId };
}

/** Fire-and-forget `lastUsedAt` bump; errors are swallowed by the caller. */
export async function touchSession(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastUsedAt: new Date() },
  });
}

export type SessionView = {
  id: string;
  current: boolean;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
};

export async function listSessions(
  userId: string,
  currentSessionId: string,
): Promise<SessionView[]> {
  const rows = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
  });
  return rows.map((s) => ({
    id: s.id,
    current: s.id === currentSessionId,
    userAgent: s.userAgent,
    createdAt: s.createdAt.toISOString(),
    lastUsedAt: s.lastUsedAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
  }));
}

/** Revoke one session. 404 if it is not an active session of `userId`. */
export async function revokeSession(
  userId: string,
  sessionId: string,
): Promise<void> {
  const result = await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) {
    throw HttpError.notFound("セッションが見つかりません");
  }
}

/**
 * Revoke every active session for the user. When `exceptSessionId` is
 * given (logout-of-other-devices), that one is kept. Returns the count.
 */
export async function revokeAllSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}
