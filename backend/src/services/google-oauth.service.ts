/**
 * Thin client for Google's OAuth 2.0 token endpoint + id_token
 * verification. No SDK: `fetch` for HTTP, `node:crypto` for the RS256
 * signature check (`createPublicKey({ format: "jwk" })`).
 *
 *   exchangeCode()      authorization code (+ PKCE verifier) → tokens
 *   refreshAccessToken() refresh token → fresh access token
 *   revokeToken()       best-effort revoke on disconnect
 *   verifyIdToken()     JWT → trusted { sub, email, ... } identity
 */

import crypto from "node:crypto";

import { HttpError } from "../lib/http-error.js";
import { step } from "../lib/api-flow.js";
import {
  GOOGLE_CLIENT_IDS,
  GOOGLE_ID_TOKEN_ISSUERS,
  GOOGLE_JWKS_URL,
  GOOGLE_REVOKE_URL,
  GOOGLE_TOKEN_URL,
  googleClientSecretFor,
} from "../config/google.js";

export type GoogleTokens = {
  accessToken: string;
  /** Null when Google didn't return one (consent already granted). */
  refreshToken: string | null;
  idToken: string;
  /** Space-separated granted scopes. */
  scope: string;
  accessTokenExpiresAt: Date;
};

type TokenErrorBody = { error?: string; error_description?: string };

/** Raised when Google says the grant is dead (user revoked access). */
export class GoogleGrantRevokedError extends Error {
  constructor(message = "Google の認可が取り消されています") {
    super(message);
    this.name = "GoogleGrantRevokedError";
  }
}

async function postForm(
  url: string,
  form: Record<string, string>,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });
}

export async function exchangeCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): Promise<GoogleTokens> {
  const form: Record<string, string> = {
    grant_type: "authorization_code",
    code: input.code,
    code_verifier: input.codeVerifier,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
  };
  const secret = googleClientSecretFor(input.clientId);
  if (secret) form.client_secret = secret;

  const res = await postForm(GOOGLE_TOKEN_URL, form);
  const body = (await res.json().catch(() => ({}))) as TokenErrorBody &
    Record<string, unknown>;
  if (!res.ok) {
    step("error", "google: code exchange failed", { error: body.error });
    throw HttpError.badRequest(
      `Google 認証に失敗しました（${body.error ?? res.status}）`,
    );
  }
  return {
    accessToken: String(body.access_token),
    refreshToken: (body.refresh_token as string) ?? null,
    idToken: String(body.id_token),
    scope: (body.scope as string) ?? "",
    accessTokenExpiresAt: new Date(
      Date.now() + Number(body.expires_in ?? 3600) * 1000,
    ),
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
): Promise<{ accessToken: string; scope: string; accessTokenExpiresAt: Date }> {
  const form: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  };
  const secret = googleClientSecretFor(clientId);
  if (secret) form.client_secret = secret;

  const res = await postForm(GOOGLE_TOKEN_URL, form);
  const body = (await res.json().catch(() => ({}))) as TokenErrorBody &
    Record<string, unknown>;
  if (!res.ok) {
    if (body.error === "invalid_grant") {
      throw new GoogleGrantRevokedError();
    }
    throw HttpError.badGateway(
      `Google トークンの更新に失敗しました（${body.error ?? res.status}）`,
    );
  }
  return {
    accessToken: String(body.access_token),
    scope: (body.scope as string) ?? "",
    accessTokenExpiresAt: new Date(
      Date.now() + Number(body.expires_in ?? 3600) * 1000,
    ),
  };
}

export async function revokeToken(token: string): Promise<void> {
  await postForm(GOOGLE_REVOKE_URL, { token }).catch(() => undefined);
}

// --- id_token verification --------------------------------------------------

type Jwk = JsonWebKey & { kid?: string; alg?: string };

let jwksCache: { keys: Jwk[]; expiresAt: number } | null = null;

async function getSigningKeys(): Promise<Jwk[]> {
  if (jwksCache && Date.now() < jwksCache.expiresAt) {
    return jwksCache.keys;
  }
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) {
    throw HttpError.badGateway("Google 公開鍵の取得に失敗しました");
  }
  const body = (await res.json()) as { keys: Jwk[] };
  const maxAge = /max-age=(\d+)/.exec(
    res.headers.get("cache-control") ?? "",
  );
  jwksCache = {
    keys: body.keys ?? [],
    expiresAt: Date.now() + (maxAge ? Number(maxAge[1]) : 3600) * 1000,
  };
  return jwksCache.keys;
}

/** For tests — drop the cached JWKS. */
export function resetJwksCache(): void {
  jwksCache = null;
}

function b64urlToBuffer(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(
    input.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64",
  );
}

export type GoogleIdentity = {
  /** Google account id — stable, use as the primary key for linking. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

type IdTokenClaims = {
  iss?: string;
  aud?: string;
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
};

/**
 * Pure claim checks (issuer / audience / expiry), split out so they can
 * be unit-tested without a real signed token. Throws `HttpError` on any
 * failure. `allowedAudiences` defaults to the configured client ids.
 */
export function assertIdTokenClaims(
  claims: IdTokenClaims,
  opts: { nowSeconds?: number; allowedAudiences?: string[] } = {},
): asserts claims is IdTokenClaims & { sub: string; exp: number } {
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  const audiences = opts.allowedAudiences ?? GOOGLE_CLIENT_IDS;

  if (!claims.iss || !GOOGLE_ID_TOKEN_ISSUERS.has(claims.iss)) {
    throw HttpError.badRequest("id_token の発行者が不正です");
  }
  if (!claims.aud || !audiences.includes(claims.aud)) {
    throw HttpError.badRequest("id_token の対象クライアントが一致しません");
  }
  if (typeof claims.exp !== "number" || claims.exp < now - 60) {
    throw HttpError.badRequest("id_token の有効期限が切れています");
  }
  if (!claims.sub) {
    throw HttpError.badRequest("id_token に sub がありません");
  }
}

export async function verifyIdToken(idToken: string): Promise<GoogleIdentity> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw HttpError.badRequest("id_token の形式が不正です");
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string };
  let claims: IdTokenClaims;
  try {
    header = JSON.parse(b64urlToBuffer(headerB64).toString("utf8"));
    claims = JSON.parse(b64urlToBuffer(payloadB64).toString("utf8"));
  } catch {
    throw HttpError.badRequest("id_token を解析できません");
  }

  if (header.alg !== "RS256") {
    throw HttpError.badRequest("id_token の署名方式に対応していません");
  }

  const jwk = (await getSigningKeys()).find((k) => k.kid === header.kid);
  if (!jwk) {
    throw HttpError.badRequest("id_token の署名鍵が見つかりません");
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const verified = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${headerB64}.${payloadB64}`),
    publicKey,
    b64urlToBuffer(signatureB64),
  );
  if (!verified) {
    throw HttpError.badRequest("id_token の署名を検証できません");
  }

  assertIdTokenClaims(claims);

  return {
    sub: String(claims.sub),
    email: String(claims.email ?? "").trim().toLowerCase(),
    emailVerified:
      claims.email_verified === true || claims.email_verified === "true",
    name: claims.name?.trim() || null,
    picture: claims.picture ?? null,
  };
}
