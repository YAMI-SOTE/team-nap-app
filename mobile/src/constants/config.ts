const apiUrl = process.env.EXPO_PUBLIC_API_URL;

/**
 * Caller identity sent as the `X-User-Id` header. There is no real auth
 * yet — this is a stable placeholder that matches the backend's seeded
 * dev user, so behaviour is unchanged until a login flow sets it.
 */
const userId =
  process.env.EXPO_PUBLIC_USER_ID ?? "00000000-0000-0000-0000-000000000001";

export const config = {
  apiUrl,
  userId,
};
