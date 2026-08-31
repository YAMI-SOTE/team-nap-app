import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { createSession } from "./session.service.js";

/**
 * Email + password sign-up / login. Both issue a session (see
 * `session.service.ts`) and return the raw token plus a public view of
 * the user. Passwords are stored as scrypt hashes and never returned.
 */

export type PublicUser = {
  id: string;
  name: string | null;
  email: string;
};

export type AuthResult = {
  token: string;
  user: PublicUser;
};

function toPublicUser(u: {
  id: string;
  name: string | null;
  email: string;
}): PublicUser {
  return { id: u.id, name: u.name, email: u.email };
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
      throw HttpError.conflict("That email is already registered");
    }
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { name: name || existing.name, passwordHash: await hashPassword(input.password) },
    });
    const { token } = await createSession(user.id, userAgent);
    return { token, user: toPublicUser(user) };
  }

  const user = await prisma.user.create({
    data: { email, name: name || null, passwordHash: await hashPassword(input.password) },
  });
  const { token } = await createSession(user.id, userAgent);
  return { token, user: toPublicUser(user) };
}

export async function login(
  input: { email: string; password: string },
  userAgent?: string | null,
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });

  // Same error + a hash comparison whether or not the user exists, so the
  // response does not reveal which emails are registered.
  const ok = await verifyPassword(
    input.password,
    user?.passwordHash ?? "scrypt$00$00",
  );
  if (!user || !ok) {
    throw HttpError.unauthorized("Incorrect email or password");
  }

  const { token } = await createSession(user.id, userAgent);
  return { token, user: toPublicUser(user) };
}
