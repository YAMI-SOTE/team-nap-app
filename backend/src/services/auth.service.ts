import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { ensureOnboarding } from "./onboarding.service.js";
import { createSession, revokeAllSessions } from "./session.service.js";
import { leaveTeam } from "./team.service.js";

/**
 * Email + password sign-up / login. Both issue a session (see
 * `session.service.ts`) and return the raw token plus a public view of
 * the user. Passwords are stored as scrypt hashes and never returned.
 */

export type PublicUser = {
  id: string;
  name: string | null;
  /** Chosen avatar id, or null (initials fallback). */
  avatar: string | null;
  email: string;
  /** false until the user finishes onboarding — the client gates on this. */
  onboardingCompleted: boolean;
};

export type AuthResult = {
  token: string;
  user: PublicUser;
};

type UserWithOnboarding = {
  id: string;
  name: string | null;
  avatar: string | null;
  email: string;
  onboarding: { completedAt: Date | null } | null;
};

function toPublicUser(u: UserWithOnboarding): PublicUser {
  return {
    id: u.id,
    name: u.name,
    avatar: u.avatar ?? null,
    email: u.email,
    onboardingCompleted: u.onboarding?.completedAt != null,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function signUp(
  input: { name: string; email: string; password: string },
  userAgent?: string | null,
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // A row may already exist from the legacy `ensureUser` path (no
    // password). Let that user claim the account by setting a password;
    // otherwise the email is genuinely taken.
    if (existing.passwordHash) {
      throw HttpError.conflict("このメールアドレスは既に登録されています");
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: name || existing.name, passwordHash: await hashPassword(input.password) },
    });
    await ensureOnboarding(existing.id);
    const { token } = await createSession(existing.id, userAgent);
    return { token, user: await getPublicUser(existing.id) };
  }

  const created = await prisma.user.create({
    data: { email, name: name || null, passwordHash: await hashPassword(input.password) },
  });
  await ensureOnboarding(created.id);
  const { token } = await createSession(created.id, userAgent);
  return { token, user: await getPublicUser(created.id) };
}

export async function getPublicUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { onboarding: { select: { completedAt: true } } },
  });
  if (!user) {
    throw HttpError.unauthorized("アカウントが存在しません");
  }
  return toPublicUser(user);
}

/**
 * Update the signed-in user's display name and/or email. Email is
 * normalized and must stay unique (409 on clash). The confirm-email-twice
 * check is a client-side concern; the API only takes the final value.
 */
export async function updateProfile(
  userId: string,
  input: { name?: string; email?: string; avatar?: string | null },
): Promise<PublicUser> {
  const data: { name?: string; email?: string; avatar?: string | null } = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.avatar !== undefined) data.avatar = input.avatar || null;
  if (input.email !== undefined) {
    const email = normalizeEmail(input.email);
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash && clash.id !== userId) {
      throw HttpError.conflict("このメールアドレスは既に登録されています");
    }
    data.email = email;
  }
  if (Object.keys(data).length === 0) return getPublicUser(userId);

  await prisma.user.update({ where: { id: userId }, data });
  return getPublicUser(userId);
}

/**
 * Dev-only inspection: the caller's stored password hash + session count.
 * Registered only when `NODE_ENV !== "production"`.
 */
export async function getDebugInfo(userId: string) {
  const [user, sessionCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { onboarding: { select: { completedAt: true } } },
    }),
    prisma.session.count({ where: { userId, revokedAt: null } }),
  ]);
  if (!user) throw HttpError.unauthorized("アカウントが存在しません");
  return {
    user: toPublicUser(user),
    passwordHash: user.passwordHash,
    passwordHashAlgorithm: user.passwordHash?.split("$")[0] ?? null,
    activeSessions: sessionCount,
  };
}

/**
 * Permanently delete the account. Leaves the team first (so an emptied
 * team is cleaned up), then deletes the `User` — sessions, onboarding and
 * reset tokens go with it via `onDelete: Cascade`.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw HttpError.unauthorized("アカウントが存在しません");
  await leaveTeam(userId);
  await prisma.user.delete({ where: { id: userId } });
}

/**
 * Change the password of a logged-in user. Verifies the current password,
 * then revokes every *other* session (the calling one stays valid).
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  keepSessionId: string,
): Promise<{ revokedOtherSessions: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw HttpError.badRequest("現在のパスワードが正しくありません");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  const revokedOtherSessions = await revokeAllSessions(userId, keepSessionId);
  return { revokedOtherSessions };
}

export async function login(
  input: { email: string; password: string },
  userAgent?: string | null,
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { onboarding: { select: { completedAt: true } } },
  });

  // Same error + a hash comparison whether or not the user exists, so the
  // response does not reveal which emails are registered.
  const ok = await verifyPassword(
    input.password,
    user?.passwordHash ?? "scrypt$00$00",
  );
  if (!user || !ok) {
    throw HttpError.unauthorized("メールアドレスまたはパスワードが正しくありません");
  }

  const { token } = await createSession(user.id, userAgent);
  return { token, user: toPublicUser(user) };
}
