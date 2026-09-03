import { api } from "@/services/api";

import type {
  AuthDebugResponse,
  AuthResult,
  AuthUser,
  OnboardingResponse,
} from "@/types/api";

/** Thin wrappers over `/api/v1/auth/*` and `/api/v1/onboarding/*`. */

export function login(email: string, password: string): Promise<AuthResult> {
  return api.post<AuthResult>("/auth/login", { email, password });
}

export function signUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  return api.post<AuthResult>("/auth/signup", { name, email, password });
}

export function getMe(): Promise<{ user: AuthUser }> {
  return api.get<{ user: AuthUser }>("/auth/me");
}

export function updateProfile(
  patch: { name?: string; email?: string; avatar?: string | null },
): Promise<{ user: AuthUser }> {
  return api.patch<{ user: AuthUser }>("/auth/me", patch);
}

export function logout(): Promise<void> {
  return api.post<void>("/auth/logout", {});
}

export function deleteAccount(): Promise<void> {
  return api.del<void>("/auth/me");
}

export function requestPasswordReset(
  email: string,
): Promise<{ ok: true; resetToken?: string }> {
  return api.post<{ ok: true; resetToken?: string }>(
    "/auth/password-reset/request",
    { email },
  );
}

export function confirmPasswordReset(
  token: string,
  password: string,
): Promise<void> {
  return api.post<void>("/auth/password-reset/confirm", { token, password });
}

export function getAuthDebug(): Promise<AuthDebugResponse> {
  return api.get<AuthDebugResponse>("/auth/debug");
}

export function getOnboarding(): Promise<OnboardingResponse> {
  return api.get<OnboardingResponse>("/onboarding");
}

export function completeOnboarding(data: {
  bedtime: string;
  wakeTime: string;
  calendarConnected?: boolean;
  notificationsEnabled?: boolean;
  /** Chosen avatar id, or null to keep the initials fallback. */
  avatar?: string | null;
}): Promise<OnboardingResponse> {
  return api.post<OnboardingResponse>("/onboarding/complete", data);
}
