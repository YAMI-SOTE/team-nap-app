import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAuth } from "@/features/auth/AuthContext";
import { refreshGoogleCalendar } from "@/services/settings";

/**
 * Nudge the backend to pull fresh Google Calendar events when the app
 * comes to the foreground (and once on launch), throttled to at most once
 * every 10 minutes. Best-effort and silent: the backend no-ops unless a
 * real Google account is connected, and any error is swallowed — the
 * 15-min backend cron and the events.watch webhook are the real
 * freshness guarantees; this only tightens the common case.
 */
const MIN_INTERVAL_MS = 10 * 60_000;

export function useForegroundCalendarSync(): void {
  const { status } = useAuth();
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (status !== "signedIn") return;

    const maybeSync = () => {
      if (Date.now() - lastRunRef.current < MIN_INTERVAL_MS) return;
      lastRunRef.current = Date.now();
      void refreshGoogleCalendar().catch(() => undefined);
    };

    maybeSync();
    const sub = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        if (next === "active") maybeSync();
      },
    );
    return () => sub.remove();
  }, [status]);
}
