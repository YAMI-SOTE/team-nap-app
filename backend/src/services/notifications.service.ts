type NotificationKind =
  | "welcome"
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

/** Every feed starts with a single welcome notification. */
function initialFeed(): NotificationItem[] {
  return [
    {
      id: "welcome",
      kind: "welcome",
      title: "TEAM NAPにようこそ、仮眠をとりませんか?",
      body: "15分の仮眠から始めてみましょう。チームからの提案やお知らせもここに届きます。",
      timestamp: "たった今",
      read: false,
      group: "today",
    },
  ];
}

function feedFor(userId: string): NotificationItem[] {
  let feed = byUser.get(userId);
  if (!feed) {
    feed = initialFeed();
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
