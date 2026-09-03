/**
 * "Sign in with Google" on the client. Runs the Authorization Code + PKCE
 * flow with `expo-auth-session` (system browser / popup), then hands the
 * one-time `code` to our backend (`POST /auth/google`), which does the
 * secret-bearing token exchange and returns one of our own sessions.
 *
 * The client never sees Google access / refresh tokens.
 */

import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { api } from "@/services/api";
import { config } from "@/constants/config";

import type { AuthResult, AuthUser } from "@/types/api";

// Finishes the redirect in a web popup / returning browser tab.
WebBrowser.maybeCompleteAuthSession();

const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events.readonly",
];

/** The right client id for the current platform (falls back to web). */
function platformClientId(): string | undefined {
  const g = config.googleAuth;
  if (Platform.OS === "ios") return g.iosClientId ?? g.webClientId;
  if (Platform.OS === "android") return g.androidClientId ?? g.webClientId;
  return g.webClientId;
}

/** Whether a Google client id is configured for this platform. */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(platformClientId());
}

/**
 * Web: the app origin (register it as an Authorized redirect URI on the
 * Web OAuth client). Native: our custom scheme, intercepted by the auth
 * session — no extra Info.plist / intent-filter entry needed.
 */
function buildRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: "teamnap",
    path: "oauthredirect",
  });
}

/** User dismissed the Google consent screen — not a real failure. */
export class GoogleAuthCancelled extends Error {
  constructor() {
    super("Googleログインがキャンセルされました");
    this.name = "GoogleAuthCancelled";
  }
}

type GooglePromptOutcome = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
};

/** Open the consent screen and return the authorization code + verifier. */
async function promptForGoogleCode(): Promise<GooglePromptOutcome> {
  const clientId = platformClientId();
  if (!clientId) {
    throw new Error("Googleログインは未設定です");
  }
  const redirectUri = buildRedirectUri();

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { access_type: "offline", prompt: "consent" },
  });
  await request.makeAuthUrlAsync(DISCOVERY);
  const result = await request.promptAsync(DISCOVERY);

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new GoogleAuthCancelled();
  }
  if (result.type === "error") {
    throw new Error(
      result.error?.message ?? "Google認証でエラーが発生しました",
    );
  }
  if (result.type !== "success" || !result.params.code) {
    throw new Error("Google認証を完了できませんでした");
  }

  return {
    code: result.params.code,
    codeVerifier: request.codeVerifier ?? "",
    redirectUri,
    clientId,
  };
}

/** Full sign-in: consent → code → `POST /auth/google` → `{ token, user }`. */
export async function signInWithGoogle(): Promise<AuthResult> {
  const outcome = await promptForGoogleCode();
  return api.post<AuthResult>("/auth/google", outcome);
}

/**
 * Link Google to the already signed-in account (settings). No new
 * session — just attaches the `GoogleAccount` and kicks off calendar
 * sync. Returns the refreshed user.
 */
export async function linkGoogleAccount(): Promise<AuthUser> {
  const outcome = await promptForGoogleCode();
  const { user } = await api.post<{ user: AuthUser }>(
    "/auth/google/link",
    outcome,
  );
  return user;
}
