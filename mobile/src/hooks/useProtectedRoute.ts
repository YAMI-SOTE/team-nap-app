import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";

import { useAuth } from "@/features/auth/AuthContext";

/** Screens reachable without a session (all live under `(auth)`). */
const PUBLIC_SCREENS = new Set(["login", "signup", "forgot-password"]);

/**
 * Enforces the auth gate on every navigation — including a directly-typed
 * URL on web (`/home`, `/settings`, …). Without this, expo-router happily
 * renders any route regardless of session.
 *
 *   signedOut  + not a public screen        → /login
 *   signedIn   + onboarding not finished     → /onboarding
 *   signedIn   + finished + on auth/splash   → /home
 *
 * While `status === "loading"` nothing is redirected; the root layout
 * shows a boot overlay so protected content can't flash first.
 */
export function useProtectedRoute() {
  const { status, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    const path = segments as readonly string[];
    const leaf = path[path.length - 1] ?? "";
    const onPublicScreen = PUBLIC_SCREENS.has(leaf);
    const onOnboarding = leaf === "onboarding";
    const onSplash = leaf === "splash" || leaf === "";

    if (status === "signedOut") {
      if (!onPublicScreen) router.replace("/login");
      return;
    }

    // signedIn
    if (!user?.onboardingCompleted) {
      if (!onOnboarding) router.replace("/onboarding");
      return;
    }
    if (onPublicScreen || onOnboarding || onSplash) {
      router.replace("/home");
    }
  }, [status, user?.onboardingCompleted, segments, router]);
}
