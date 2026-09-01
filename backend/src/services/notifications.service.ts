type NotificationKind =
  | "team_nap_suggestion"
  | "wake_request"
  | "rest_request"
  | "nap_ended"
  | "weekly_review"
  | "member_joined";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Relative time label, e.g. "2分前". */
  timestamp: string;
  read: boolean;
  group: "today" | "earlier";
};

/**
 * Per-user notification feed. Still in-memory (a `Map` keyed by userId,
 * lost on restart) but no longer a single global list — every read/write
 * is scoped to the authenticated user. `addNotification` is called from
 * `nudge.service` (targets the recipient) and `team.service` (notifies
 * existing team members when someone joins).
 */
const byUser = new Map<string, NotificationItem[]>();

/** Demo items shown the first time a user opens the feed (dev UX only). */
function demoFeed(): NotificationItem[] {
  return [
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
  ];
}

function feedFor(userId: string): NotificationItem[] {
  let feed = byUser.get(userId);
  if (!feed) {
    feed = demoFeed();
    byUser.set(userId, feed);
  }
  return feed;
}

export function listNotifications(userId: string): NotificationItem[] {
  return feedFor(userId);
}

/** Prepend a new notification to `userId`'s feed. */
export function addNotification(
  userId: string,
  input: Omit<NotificationItem, "id">,
): NotificationItem {
  const item: NotificationItem = {
    id: `n${Date.now()}${Math.floor(Math.random() * 1000)}`,
    ...input,
  };
  byUser.set(userId, [item, ...feedFor(userId)]);
  return item;
}

export function markNotificationRead(
  userId: string,
  id: string,
): NotificationItem[] {
  const next = feedFor(userId).map((n) =>
    n.id === id ? { ...n, read: true } : n,
  );
  byUser.set(userId, next);
  return next;
}

export function markAllNotificationsRead(userId: string): NotificationItem[] {
  const next = feedFor(userId).map((n) => ({ ...n, read: true }));
  byUser.set(userId, next);
  return next;
}
