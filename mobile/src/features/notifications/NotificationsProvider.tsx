import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";

import { useAuth } from "@/features/auth/AuthContext";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";
import { addPushReceivedListener } from "@/services/push";
import { realtime } from "@/services/realtime";

import type { NotificationItem } from "@/types/api";

type NotificationsContextValue = {
  /** Server list, or `null` until the first load resolves. */
  items: NotificationItem[] | null;
  /** Number of unread items; the header dot shows when this is > 0. */
  unreadCount: number;
  loading: boolean;
  error: string | null;
  /**
   * Re-fetch from the backend (also runs on mount, on app foreground, and
   * whenever a push notification arrives for this device). New items also
   * arrive over the realtime socket without a re-fetch.
   */
  refresh: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

/**
 * Tapping a banner while the app is foregrounded fires both the "received"
 * and the "opened" listener for the same push; one re-fetch is enough.
 */
const PUSH_REFRESH_COALESCE_MS = 1500;

/**
 * App-wide notifications state. Mounted once at the router root so every
 * screen header reads the same unread count and any "mark read" updates
 * the indicator everywhere at once. The backend stays the source of
 * truth: optimistic updates are reconciled against the response.
 */
export function NotificationsProvider({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const lastPushRefreshRef = useRef(0);

  const refresh = useCallback(() => {
    getNotifications()
      .then((result) => {
        if (!mountedRef.current) return;
        setItems(result);
        setError(null);
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // The notifications feed is behind auth, so it can only load once the
  // session is known. Re-run whenever auth flips (sign-in / sign-out) —
  // the earlier "fetch once on mount" ran before the token was set and
  // never retried, which is why the feed looked empty after login.
  useEffect(() => {
    if (status === "loading") return;

    if (status !== "signedIn") {
      setItems(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    refresh();

    // Keep the unread dot current when the user returns to the app.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    // A push means the server-side feed already changed, so pull it right
    // away instead of waiting for the next foreground: the bell count and
    // the list update while the user is still looking at the screen.
    const offPush = addPushReceivedListener(() => {
      const now = Date.now();
      if (now - lastPushRefreshRef.current < PUSH_REFRESH_COALESCE_MS) return;
      lastPushRefreshRef.current = now;
      refresh();
    });

    // The socket carries the item itself, so the feed updates with no
    // round-trip — and, unlike push, it works on web and needs no
    // notification permission. Insert by id so a racing refresh cannot
    // duplicate the row.
    const offSocket = realtime.on((event) => {
      if (event.type !== "notification") return;
      setItems((prev) => {
        if (prev === null) return prev;
        if (prev.some((n) => n.id === event.data.id)) return prev;
        return [event.data, ...prev];
      });
    });

    return () => {
      subscription.remove();
      offPush();
      offSocket();
    };
  }, [status, refresh]);

  const markRead = useCallback((id: string) => {
    // Optimistic update; reconcile with the server's copy on success.
    setItems(
      (prev) =>
        prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? null,
    );
    markNotificationRead(id)
      .then((next) => {
        if (mountedRef.current) setItems(next);
      })
      .catch(() => {
        /* keep the optimistic state */
      });
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
    markAllNotificationsRead()
      .then((next) => {
        if (mountedRef.current) setItems(next);
      })
      .catch(() => {
        /* keep the optimistic state */
      });
  }, []);

  const unreadCount = useMemo(
    () => (items ?? []).filter((n) => !n.read).length,
    [items],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({
      items,
      unreadCount,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
    }),
    [items, unreadCount, loading, error, refresh, markRead, markAllRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotificationsContext must be used within a NotificationsProvider",
    );
  }
  return context;
}
