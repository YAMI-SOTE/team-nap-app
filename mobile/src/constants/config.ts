const apiUrl = process.env.EXPO_PUBLIC_API_URL;

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
  googleAuth,
};
