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

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";

import type { NotificationItem } from "@/types/api";

type NotificationsContextValue = {
  /** Server list, or `null` until the first load resolves. */
  items: NotificationItem[] | null;
  /** Number of unread items; the header dot shows when this is > 0. */
  unreadCount: number;
  loading: boolean;
  error: string | null;
  /** Re-fetch from the backend (also runs on mount and on app foreground). */
  refresh: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

/**
 * App-wide notifications state. Mounted once at the router root so every
 * screen header reads the same unread count and any "mark read" updates
 * the indicator everywhere at once. The backend stays the source of
 * truth: optimistic updates are reconciled against the response.
 */
export function NotificationsProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

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
    refresh();

    // Keep the unread dot current when the user returns to the app.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    return () => {
      mountedRef.current = false;
      subscription.remove();
    };
  }, [refresh]);

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
