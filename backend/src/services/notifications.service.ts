import { prisma } from "../lib/prisma.js";
import { sendPushToUser } from "./push.service.js";

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
  /** Relative time label derived from `createdAt` at read time, e.g. "2分前". */
  timestamp: string;
  read: boolean;
  group: "today" | "earlier";
};

export type NewNotification = {
  kind: NotificationKind;
  title: string;
  body: string;
};

/**
 * Per-user notification feed, persisted in Postgres (`Notification`
 * model) so it survives a restart. Every read/write is scoped to the one
 * user. `addNotification` is called from `nudge.service` (targets the
 * recipient) and `team.service` (notifies existing members on join /
 * removal / nap suggestion).
 *
 * The stored `createdAt` is authoritative; the relative `timestamp`
 * label and the `today` / `earlier` group are derived on every read so
 * they never go stale.
 */

const WELCOME: NewNotification = {
  kind: "welcome",
  title: "TEAM NAPにようこそ、仮眠をとりませんか?",
  body: "15分の仮眠から始めてみましょう。チームからの提案やお知らせもここに届きます。",
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function pad(n: number): string {
  return `${n}`.padStart(2, "0");
}

/** Server-local calendar day of `date` as "YYYY-MM-DD". Matches todayISO(). */
function localISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The "2分前" label + which section the item belongs to, both from
 * `createdAt`. Pure — exported for tests.
 */
export function describeTime(
  createdAt: Date,
  now: Date = new Date(),
): { timestamp: string; group: "today" | "earlier" } {
  const diff = Math.max(0, now.getTime() - createdAt.getTime());
  let timestamp: string;
  if (diff < MINUTE) timestamp = "たった今";
  else if (diff < HOUR) timestamp = `${Math.floor(diff / MINUTE)}分前`;
  else if (diff < DAY) timestamp = `${Math.floor(diff / HOUR)}時間前`;
  else if (diff < 7 * DAY) timestamp = `${Math.floor(diff / DAY)}日前`;
  else
    timestamp = `${createdAt.getFullYear()}/${createdAt.getMonth() + 1}/${createdAt.getDate()}`;

  const group =
    localISODate(createdAt) === localISODate(now) ? "today" : "earlier";
  return { timestamp, group };
}

type Row = {
  id: string;
  kind: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

function toItem(row: Row, now: Date): NotificationItem {
  const { timestamp, group } = describeTime(row.createdAt, now);
  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    title: row.title,
    body: row.body,
    timestamp,
    read: row.readAt !== null,
    group,
  };
}

/**
 * Every feed starts with a single welcome notification. Seeded lazily on
 * the first read so it works for users created by any path (signup, seed,
 * legacy `ensureUser`). Idempotent — a second concurrent call is a no-op.
 */
async function ensureWelcome(userId: string): Promise<void> {
  const existing = await prisma.notification.findFirst({
    where: { userId, kind: "welcome" },
    select: { id: true },
  });
  if (existing) return;
  try {
    await prisma.notification.create({ data: { userId, ...WELCOME } });
  } catch {
    // Lost a race with a concurrent seed, or the user row is gone — the
    // feed just renders without the welcome item.
  }
}

export async function listNotifications(
  userId: string,
): Promise<NotificationItem[]> {
  await ensureWelcome(userId);
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  return rows.map((r) => toItem(r, now));
}

/** Append a notification to `userId`'s feed (and push it to their devices). */
export async function addNotification(
  userId: string,
  input: NewNotification,
): Promise<NotificationItem> {
  const row = await prisma.notification.create({
    data: { userId, kind: input.kind, title: input.title, body: input.body },
  });

  // Fire the push without blocking or risking the caller — the feed row
  // is already written. `sendPushToUser` handles opt-in + errors itself.
  void sendPushToUser(userId, {
    title: input.title,
    body: input.body,
    data: { kind: input.kind },
  });

  return toItem(row, new Date());
}

export async function markNotificationRead(
  userId: string,
  id: string,
): Promise<NotificationItem[]> {
  // Scoped to userId so another user's id is a silent no-op, matching the
  // previous in-memory behaviour.
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return listNotifications(userId);
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<NotificationItem[]> {
  await ensureWelcome(userId);
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return listNotifications(userId);
}
