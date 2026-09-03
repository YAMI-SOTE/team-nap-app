/**
 * Derived Google-OAuth configuration. One place decides "is the feature
 * on?", which client ids are legitimate, which one carries a secret, and
 * which redirect URIs the mobile / web client is allowed to present.
 */

import { env } from "./env.js";

/** Google's well-known OAuth endpoints (constant). */
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
export const GOOGLE_CALENDAR_BASE =
  "https://www.googleapis.com/calendar/v3";
export const GOOGLE_ID_TOKEN_ISSUERS = new Set([
  "accounts.google.com",
  "https://accounts.google.com",
]);

/** Every OAuth client id this backend will accept an id_token / code from. */
export const GOOGLE_CLIENT_IDS: string[] = [
  env.GOOGLE_OAUTH_CLIENT_ID,
  env.GOOGLE_OAUTH_IOS_CLIENT_ID,
  env.GOOGLE_OAUTH_ANDROID_CLIENT_ID,
].filter((v): v is string => Boolean(v));

/** Space-separated → array, empty entries dropped. */
export const GOOGLE_SCOPES: string[] = env.GOOGLE_OAUTH_SCOPES.split(/\s+/)
  .map((s) => s.trim())
  .filter(Boolean);

const REDIRECT_ALLOWLIST: string[] = env.GOOGLE_OAUTH_REDIRECT_URIS.split(
  /[\s,]+/,
)
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * True once the minimum is configured: the web client id (also the
 * id_token audience) plus the token-encryption key. Without both, callers
 * should reject Google login and keep the sample-calendar behaviour.
 */
export function googleOAuthConfigured(): boolean {
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_TOKEN_ENC_KEY,
  );
}

/** The client id to use when the caller didn't name one (web / fallback). */
export function defaultGoogleClientId(): string | undefined {
  return env.GOOGLE_OAUTH_CLIENT_ID ?? GOOGLE_CLIENT_IDS[0];
}

/** `clientId` if it's one we know, else the default. Never trusts input blindly. */
export function resolveGoogleClientId(clientId?: string): string {
  const id =
    clientId && GOOGLE_CLIENT_IDS.includes(clientId)
      ? clientId
      : defaultGoogleClientId();
  if (!id) {
    throw new Error("Google OAuth client id is not configured");
  }
  return id;
}

/** The client secret for `clientId`, or undefined for public native clients. */
export function googleClientSecretFor(clientId: string): string | undefined {
  return clientId === env.GOOGLE_OAUTH_CLIENT_ID
    ? env.GOOGLE_OAUTH_CLIENT_SECRET
    : undefined;
}

/**
 * Whether `uri` may be used as the OAuth redirect. An empty allow-list
 * (nothing configured) accepts the app's custom scheme and localhost so
 * local dev works without extra setup; once the allow-list is non-empty
 * it is authoritative.
 */
export function isAllowedRedirectUri(uri: string): boolean {
  if (REDIRECT_ALLOWLIST.length > 0) {
    return REDIRECT_ALLOWLIST.includes(uri);
  }
  return (
    uri.startsWith("teamnap://") ||
    uri.startsWith("http://localhost") ||
    uri.startsWith("https://localhost") ||
    /^https:\/\/auth\.expo\.io\//.test(uri)
  );
}
