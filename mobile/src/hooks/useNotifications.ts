import { useCallback, useEffect, useMemo, useState } from "react";

import { getNotifications } from "@/services/notifications";

import type { NotificationItem } from "@/types/api";

export type NotificationGroup = {
  key: NotificationItem["group"];
  label: string;
  items: NotificationItem[];
};

const GROUP_ORDER: NotificationGroup[] = [
  { key: "today", label: "今日", items: [] },
  { key: "earlier", label: "これまで", items: [] },
];

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getNotifications()
      .then((result) => {
        if (active) {
          setItems(result);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const markRead = useCallback((id: string) => {
    setItems(
      (prev) =>
        prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? null,
    );
    // TODO: PATCH /notifications/:id/read
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
    // TODO: POST /notifications/read-all
  }, []);

  const groups = useMemo<NotificationGroup[]>(() => {
    const list = items ?? [];
    return GROUP_ORDER.map((group) => ({
      ...group,
      items: list.filter((n) => n.group === group.key),
    })).filter((group) => group.items.length > 0);
  }, [items]);

  const unreadCount = useMemo(
    () => (items ?? []).filter((n) => !n.read).length,
    [items],
  );

  return { items, groups, unreadCount, loading, error, markRead, markAllRead };
}
