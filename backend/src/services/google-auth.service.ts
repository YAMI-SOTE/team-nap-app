/**
 * "Sign in with Google" — turns an OAuth authorization code into one of
 * our own opaque sessions, and (separately) links Google to an already
 * signed-in account.
 *
 * The app's session model is unchanged: Google is only a way to prove
 * identity + obtain Calendar access. We still issue a `Session` bearer
 * token, identical in shape to `/auth/login`.
 */

import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { step } from "../lib/api-flow.js";
import { seal } from "../lib/secret-box.js";
import {
  googleOAuthConfigured,
  isAllowedRedirectUri,
  resolveGoogleClientId,
} from "../config/google.js";
import { ensureOnboarding } from "./onboarding.service.js";
import { createSession } from "./session.service.js";
import { closeUserSockets } from "../realtime/hub.js";
import {
  getPublicUser,
  type AuthResult,
  type PublicUser,
} from "./auth.service.js";
import {
  exchangeCode,
  verifyIdToken,
  type GoogleIdentity,
  type GoogleTokens,
} from "./google-oauth.service.js";

export type GoogleAuthInput = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  /** Which OAuth client the app used; validated against the known set. */
  clientId?: string;
};

function assertConfigured(): void {
  if (!googleOAuthConfigured()) {
    throw HttpError.badRequest(
      "Google ログインは現在無効です（サーバー未設定）",
    );
  }
}

/** Run the code exchange + id_token verification, or throw `HttpError`. */
async function resolveGoogleIdentity(
  input: GoogleAuthInput,
): Promise<{ identity: GoogleIdentity; tokens: GoogleTokens }> {
  assertConfigured();
  if (!isAllowedRedirectUri(input.redirectUri)) {
    throw HttpError.badRequest("リダイレクト URI が許可されていません");
  }
  const clientId = resolveGoogleClientId(input.clientId);
  const tokens = await exchangeCode({
    code: input.code,
    codeVerifier: input.codeVerifier,
    redirectUri: input.redirectUri,
    clientId,
  });
  const identity = await verifyIdToken(tokens.idToken);
  if (!identity.email) {
    throw HttpError.badRequest(
      "Google アカウントのメールアドレスを取得できませんでした",
    );
  }
  return { identity, tokens };
}

/**
 * Find or create the `User` for a Google identity.
 *  - `googleId` already known → that user.
 *  - same email as a password user + Google says it's verified → link.
 *  - same email but unverified → 409 (log in with the password first).
 *  - otherwise → brand-new passwordless user.
 * When `requireUserId` is given (settings "link" flow) the resolved user
 * must be that same user, otherwise the Google account is already taken.
 */
async function resolveUserId(
  identity: GoogleIdentity,
  requireUserId?: string,
): Promise<string> {
  const byGoogle = await prisma.user.findUnique({
    where: { googleId: identity.sub },
  });
  if (byGoogle) {
    if (requireUserId && byGoogle.id !== requireUserId) {
      throw HttpError.conflict(
        "この Google アカウントは別のユーザーに連携済みです",
      );
    }
    if (!byGoogle.name && identity.name) {
      await prisma.user.update({
        where: { id: byGoogle.id },
        data: { name: identity.name },
      });
    }
    return byGoogle.id;
  }

  if (requireUserId) {
    await prisma.user.update({
      where: { id: requireUserId },
      data: { googleId: identity.sub },
    });
    return requireUserId;
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: identity.email },
  });
  if (byEmail) {
    if (!identity.emailVerified) {
      throw HttpError.conflict(
        "このメールアドレスは既に登録されています。パスワードでログインしてから設定で Google と連携してください",
      );
    }
    await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: identity.sub,
        name: byEmail.name ?? identity.name,
      },
    });
    return byEmail.id;
  }

  const created = await prisma.user.create({
    data: {
      email: identity.email,
      name: identity.name,
      googleId: identity.sub,
    },
  });
  step("service", "google: new user", { userId: created.id });
  return created.id;
}

/** Upsert the `GoogleAccount` row, keeping an existing refresh token when
 *  Google didn't return a new one. */
async function persistGoogleAccount(
  userId: string,
  identity: GoogleIdentity,
  tokens: GoogleTokens,
): Promise<void> {
  const existing = await prisma.googleAccount.findUnique({
    where: { userId },
    select: { refreshTokenEnc: true },
  });
  const refreshTokenEnc = tokens.refreshToken
    ? seal(tokens.refreshToken)
    : existing?.refreshTokenEnc ?? null;

  const shared = {
    googleId: identity.sub,
    email: identity.email,
    scope: tokens.scope,
    accessTokenEnc: seal(tokens.accessToken),
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshTokenEnc,
  };
  await prisma.googleAccount.upsert({
    where: { userId },
    update: shared,
    create: { userId, ...shared },
  });
}

/** Kick off calendar bootstrap without blocking the auth response. */
function bootstrapCalendar(userId: string): void {
  void import("./google-calendar.service.js")
    .then(async (m) => {
      await m.syncCalendar(userId).catch(() => undefined);
      await m.ensureCalendarWatch(userId).catch(() => undefined);
    })
    .catch(() => undefined);
}

export async function signInWithGoogle(
  input: GoogleAuthInput,
  userAgent?: string | null,
): Promise<AuthResult> {
  const { identity, tokens } = await resolveGoogleIdentity(input);
  const userId = await resolveUserId(identity);
  await persistGoogleAccount(userId, identity, tokens);
  await ensureOnboarding(userId);
  const { token } = await createSession(userId, userAgent);
  // Same single-device rule as email login (see `createSession`).
  closeUserSockets(userId, "signed in on another device");
  bootstrapCalendar(userId);
  return { token, user: await getPublicUser(userId) };
}

/** Settings flow: attach Google to the current user; no new session. */
export async function linkGoogleAccount(
  userId: string,
  input: GoogleAuthInput,
): Promise<PublicUser> {
  const { identity, tokens } = await resolveGoogleIdentity(input);
  const resolvedId = await resolveUserId(identity, userId);
  await persistGoogleAccount(resolvedId, identity, tokens);
  bootstrapCalendar(resolvedId);
  return getPublicUser(resolvedId);
}
