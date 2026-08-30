import { api } from "@/services/api";

import type { NotificationItem } from "@/types/api";

export async function getNotifications(): Promise<NotificationItem[]> {
  return api.get<NotificationItem[]>("/notifications");
}

export async function markNotificationRead(
  id: string,
): Promise<NotificationItem[]> {
  return api.post<NotificationItem[]>(
    `/notifications/${encodeURIComponent(id)}/read`,
    {},
  );
}

export async function markAllNotificationsRead(): Promise<NotificationItem[]> {
  return api.post<NotificationItem[]>("/notifications/read-all", {});
}
