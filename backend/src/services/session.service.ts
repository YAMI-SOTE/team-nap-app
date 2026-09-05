import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { generateToken, hashToken } from "../lib/tokens.js";

/**
 * Session lifecycle. A session is an opaque bearer token whose SHA-256
 * hash is stored in `Session`. Tokens expire after `SESSION_TTL_HOURS`
 * and can be revoked individually or all at once.
 *
 * **One device at a time — the device already signed in keeps the account.**
 * If a live session exists, issuing another one is refused with a 409
 * rather than the newcomer taking over. The enforcement lives in
 * `createSession` rather than in each caller, so email login, sign-up and
 * Google login all get it — and so does anything added later.
 *
 * Ways out of a session you can no longer reach: sign out on that device,
 * `POST /auth/logout-others` from it, or a password reset, which revokes
 * every session (`password-reset.service`). Sessions also expire on their
 * own after `SESSION_TTL_HOURS`.
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

/** Thrown when the account is already signed in somewhere else. */
export const ALREADY_SIGNED_IN_MESSAGE =
  "すでに別の端末でログインしています。その端末でサインアウトしてから、もう一度お試しください";

/**
 * Issue a session, or refuse if the account already has one.
 *
 * The check and the insert share one transaction so a single client
 * cannot slip a second session past the check. Two clients logging in at
 * the exact same moment could still both pass under the default
 * isolation level; the result is the previous behaviour (two sessions),
 * not a lost session, and the next sign-out clears it.
 */
export async function createSession(
  userId: string,
  userAgent?: string | null,
): Promise<IssuedSession> {
  const token = generateToken();
  const expiresAt = ttlFromNow();

  const session = await prisma.$transaction(async (tx) => {
    const live = await tx.session.findFirst({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (live) throw HttpError.conflict(ALREADY_SIGNED_IN_MESSAGE);

    return tx.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        userAgent: userAgent?.slice(0, 255) ?? null,
        expiresAt,
      },
    });
  });

  return { token, sessionId: session.id, expiresAt };
}

export type ResolvedSession = {
  sessionId: string;
  userId: string;
};

/**
 * Why a token was refused. `revoked` is the interesting one: the session
 * existed and was deliberately ended — in practice because the account
 * signed in somewhere else — which is worth telling the user rather than
 * showing the generic "expired" copy.
 */
export type SessionRejection = "unknown" | "expired" | "revoked";

export type SessionLookup =
  | { ok: true; session: ResolvedSession }
  | { ok: false; reason: SessionRejection };

/** Resolve a raw bearer token, explaining a refusal. */
export async function lookupSession(token: string): Promise<SessionLookup> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!session) return { ok: false, reason: "unknown" };
  if (session.revokedAt) return { ok: false, reason: "revoked" };
  if (session.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return {
    ok: true,
    session: { sessionId: session.id, userId: session.userId },
  };
}

/**
 * Resolve a raw bearer token to its live session, or `null` when the
 * token is unknown, expired, or revoked.
 */
export async function resolveSession(
  token: string,
): Promise<ResolvedSession | null> {
  const result = await lookupSession(token);
  return result.ok ? result.session : null;
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
