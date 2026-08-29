import type { NotificationItem } from "@/types/api";

/**
 * Notification feed.
 *
 * No notification endpoint exists on the backend yet, so this returns a
 * local sample. Swap the body for `api.get("/notifications")` once the
 * endpoint exists — `NotificationItem[]` is the intended contract.
 */
const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    kind: "team_nap_suggestion",
    title: "チームから仮眠の提案",
    body: "14:30〜14:45 にみんなで15分の仮眠はどうですか？",
    timestamp: "2分前",
    read: false,
    group: "today",
  },
  {
    id: "n2",
    kind: "wake_request",
    title: "メンバーBから「起きて〜」",
    body: "そろそろ起きる時間みたいです",
    timestamp: "1時間前",
    read: false,
    group: "today",
  },
  {
    id: "n3",
    kind: "nap_ended",
    title: "仮眠が終了しました",
    body: "14:32〜14:47 の15分の仮眠を記録しました",
    timestamp: "昨日",
    read: true,
    group: "earlier",
  },
  {
    id: "n4",
    kind: "weekly_review",
    title: "今週のふりかえりが届きました",
    body: "今週は5回の仮眠、平均18分でした",
    timestamp: "2日前",
    read: true,
    group: "earlier",
  },
  {
    id: "n5",
    kind: "member_joined",
    title: "メンバーEがチームに参加しました",
    body: "チームは11人になりました",
    timestamp: "3日前",
    read: true,
    group: "earlier",
  },
];

export async function getNotifications(): Promise<NotificationItem[]> {
  return SAMPLE_NOTIFICATIONS;
}
