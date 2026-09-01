import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { hashPassword } from "../lib/password.js";
import { generateToken, hashToken } from "../lib/tokens.js";
import { revokeAllSessions } from "./session.service.js";

/**
 * "Forgot password" flow.
 *
 * `requestReset` never reveals whether an email exists — it always
 * resolves. There is no mail infrastructure yet, so the token is logged
 * to the server console and, outside production, returned in the response
 * for testing. `confirmReset` is single-use, time-limited, and revokes
 * every existing session on success.
 */

function ttlFromNow(): Date {
  return new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
}

export async function requestReset(
  rawEmail: string,
): Promise<{ resetToken?: string }> {
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return {};

  // Invalidate any tokens still outstanding for this user, then issue one.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: ttlFromNow(),
    },
  });

  console.log(
    `[password-reset] token for ${email}: ${token} ` +
      `(expires in ${env.PASSWORD_RESET_TTL_MINUTES}m)`,
  );

  // Never leak the token in production responses.
  return env.NODE_ENV === "production" ? {} : { resetToken: token };
}

export async function confirmReset(
  token: string,
  newPassword: string,
): Promise<void> {
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
    throw HttpError.badRequest("リセット用リンクが無効または期限切れです");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
  ]);

  // A password change ends every existing session.
  await revokeAllSessions(row.userId);
}
