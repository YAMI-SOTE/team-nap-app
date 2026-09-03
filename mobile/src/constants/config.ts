const apiUrl = process.env.EXPO_PUBLIC_API_URL;

/**
 * Caller identity sent as the `X-User-Id` header. There is no real auth
 * yet — this is a stable placeholder that matches the backend's seeded
 * dev user, so behaviour is unchanged until a login flow sets it.
 */
const userId =
  process.env.EXPO_PUBLIC_USER_ID ?? "00000000-0000-0000-0000-000000000001";

/**
 * Google OAuth client ids, one per platform (public values, safe to ship
 * in the bundle — the secret lives only on the backend). "Sign in with
 * Google" stays disabled until at least the relevant platform id is set.
 * See docs/google-integration.md for the Google Cloud Console setup.
 */
const googleAuth = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

export const config = {
  apiUrl,
  userId,
  googleAuth,
};
