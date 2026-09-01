import { useMemo } from "react";

import { useNotificationsContext } from "@/features/notifications/NotificationsProvider";

import type { NotificationItem } from "@/types/api";

export type NotificationGroup = {
  key: NotificationItem["group"];
  label: string;
  items: NotificationItem[];
};

const GROUP_ORDER: { key: NotificationItem["group"]; label: string }[] = [
  { key: "today", label: "今日" },
  { key: "earlier", label: "これまで" },
];

/**
 * View-model for the notifications screen. State lives in
 * `NotificationsProvider` (shared with every header bell); this hook
 * layers the "今日 / これまで" grouping on top.
 */
export function useNotifications() {
  const { items, unreadCount, loading, error, refresh, markRead, markAllRead } =
    useNotificationsContext();

  const groups = useMemo<NotificationGroup[]>(() => {
    const list = items ?? [];
    return GROUP_ORDER.map((group) => ({
      ...group,
      items: list.filter((n) => n.group === group.key),
    })).filter((group) => group.items.length > 0);
  }, [items]);

  return {
    items,
    groups,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  };
}
