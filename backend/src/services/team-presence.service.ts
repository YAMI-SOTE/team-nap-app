/**
 * Team roster + live activity snapshot. A leaf module (only Prisma +
 * domain types) so both `home.service` and the realtime hub can build the
 * same "member-status" payload without an import cycle.
 *
 * Presence has two sources, in priority order:
 *
 *   1. An open realtime socket. The hub knows exactly who is connected
 *      right now, so a signed-in member shows up the moment their socket
 *      opens. Injected via `setLivePresenceProbe` (the hub imports this
 *      module, so it cannot be imported back).
 *   2. `lastSeenAt`, bumped by authenticated REST traffic and WS pongs.
 *      This is the fallback for a member who is signed in but has no
 *      socket at this instant (backgrounded app, reconnect in flight),
 *      and it is what makes presence decay to "offline" on its own.
 */

import { prisma } from "../lib/prisma.js";
import { activeNapSession } from "./nap-session.service.js";
import type { Member, MemberStatus } from "../types/domain.js";

/** Max member avatars returned for the Home / Team / Stats rosters. */
const DISPLAY_LIMIT = 6;

/**
 * No socket and no activity for this long → the member reads as
 * "offline". Deliberately a few minutes rather than seconds: a phone that
 * backgrounds the app or drops onto a flaky network should not make the
 * member flicker out of the roster while the client reconnects.
 */
export const OFFLINE_AFTER_MS = 5 * 60_000;

/**
 * 仮眠中 is an explicit state the member chose, so it outlives a plain
 * idle window — a napping phone is locked and its socket is gone by
 * design. It still expires, though: without this a nap that was never
 * ended (app killed mid-nap) left the member showing 仮眠中 forever.
 */
export const RESTING_EXPIRES_AFTER_MS = 2 * 60 * 60_000;

/**
 * Grace after a member's last socket closes before they read as offline.
 *
 * Losing the socket is a much stronger "they left" signal than an idle
 * `lastSeenAt`, so it does not need the full `OFFLINE_AFTER_MS` window —
 * but it still needs *some* slack, because a foregrounding app or a
 * flaky network reconnects within a second or two and should not make
 * the member blink out of the roster.
 */
export const DISCONNECT_GRACE_MS = 45_000;

/** `lastSeenAt` is bumped at most this often (per member). */
const SEEN_THROTTLE_MS = 90_000;

/**
 * "Is this user holding an open realtime socket right now?" — supplied by
 * the hub at startup. Defaults to "no" so this module works standalone
 * (tests, scripts, a process with no WS server attached).
 */
let liveProbe: (userId: string) => boolean = () => false;

export function setLivePresenceProbe(probe: (userId: string) => boolean): void {
  liveProbe = probe;
}

/** Test seam — restores the "nothing is connected" default. */
export function resetLivePresenceProbe(): void {
  liveProbe = () => false;
}

/**
 * A member's presence for the roster.
 *
 * `connected` (an open socket) proves they are here, so it short-circuits
 * the staleness check. Otherwise recency decides: within the window they
 * keep their declared activity, past it they are offline — including when
 * that activity is `resting`, which is what stops an abandoned nap from
 * showing 仮眠中 indefinitely.
 */
export function deriveStatus(
  activity: "online" | "resting",
  lastSeenAt: Date | null,
  connected = false,
): MemberStatus {
  if (connected) return activity === "resting" ? "resting" : "working";
  if (!lastSeenAt) return "offline";

  const idleMs = Date.now() - lastSeenAt.getTime();
  if (activity === "resting") {
    return idleMs > RESTING_EXPIRES_AFTER_MS ? "offline" : "resting";
  }
  return idleMs > OFFLINE_AFTER_MS ? "offline" : "working";
}

/**
 * `deriveStatus` with the live-socket probe already applied — the form
 * every roster builder should use, so Home / Team / stats all agree on
 * who is here.
 */
export function deriveMemberStatus(
  userId: string,
  activity: "online" | "resting",
  lastSeenAt: Date | null,
): MemberStatus {
  return deriveStatus(activity, lastSeenAt, liveProbe(userId));
}

/**
 * Best-effort recency bump for the caller's team membership. Only writes
 * when the stored value is already older than the throttle, so it's one
 * cheap conditional UPDATE per ~90s regardless of request rate. A no-op
 * for users not in a team.
 */
export async function touchLastSeen(userId: string): Promise<void> {
  await prisma.teamMembership.updateMany({
    where: {
      userId,
      lastSeenAt: { lt: new Date(Date.now() - SEEN_THROTTLE_MS) },
    },
    data: { lastSeenAt: new Date() },
  });
}

/**
 * Drop a member out of the roster immediately — used when they sign out
 * or delete their account, where waiting out `OFFLINE_AFTER_MS` would
 * leave a signed-out person showing as 作業中 to their team.
 *
 * The epoch timestamp is the "explicitly not here" marker: it reads as
 * offline under every window above, and the next `touchLastSeen` after a
 * fresh sign-in overwrites it. Clearing `activity` at the same time stops
 * a nap that was in progress from coming back on the next login.
 *
 * Returns the team that needs re-broadcasting, or `null` for a solo user.
 */
export async function markOffline(userId: string): Promise<string | null> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId },
    select: { teamId: true },
  });
  if (!membership) return null;

  await prisma.teamMembership.update({
    where: { userId },
    data: { activity: "online", lastSeenAt: new Date(0) },
  });
  return membership.teamId;
}

/**
 * Repair a `resting` flag that outlived its nap.
 *
 * 仮眠中 is set when the Rest screen opens and cleared when it closes, so
 * an app killed mid-nap leaves the flag set with nothing behind it. The
 * live nap session (which carries a real `wakeAt` and self-expires) is the
 * ground truth: reconnecting with no session left means the nap is over.
 *
 * Returns true when it actually changed something, so the caller knows to
 * re-broadcast. Called on socket connect — the first moment we can tell
 * the difference between "still napping" and "came back from the dead".
 */
export async function reconcileActivity(userId: string): Promise<boolean> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId },
    select: { activity: true },
  });
  if (!membership || membership.activity !== "resting") return false;

  if (await activeNapSession(userId)) return false;

  await prisma.teamMembership.update({
    where: { userId },
    data: { activity: "online" },
  });
  return true;
}

/**
 * Start the countdown for a member whose last socket just closed: rewind
 * `lastSeenAt` so the normal staleness rule expires them one grace period
 * from now instead of a full window.
 *
 * A member who is 仮眠中 is deliberately unaffected in practice — resting
 * expires on its own much longer clock, so locking the phone mid-nap
 * still reads as 仮眠中.
 */
export async function markDisconnected(userId: string): Promise<void> {
  const expireAt = new Date(Date.now() - OFFLINE_AFTER_MS + DISCONNECT_GRACE_MS);
  await prisma.teamMembership.updateMany({
    // Never push `lastSeenAt` forward — only ever bring the expiry closer.
    where: { userId, lastSeenAt: { gt: expireAt } },
    data: { lastSeenAt: expireAt },
  });
}

export type MemberStatusSnapshot = {
  memberCount: number;
  memberStatusCounts: Record<MemberStatus, number>;
  members: Member[];
};

const EMPTY_SNAPSHOT: MemberStatusSnapshot = {
  memberCount: 0,
  memberStatusCounts: { working: 0, resting: 0, offline: 0 },
  members: [],
};

export { EMPTY_SNAPSHOT };

/** The team the user belongs to, or `null`. */
export async function teamIdOf(userId: string): Promise<string | null> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId },
    select: { teamId: true },
  });
  return membership?.teamId ?? null;
}

/** Roster + activity counts for a team (used by Home, Team, and realtime). */
export async function teamMemberStatus(
  teamId: string,
): Promise<MemberStatusSnapshot> {
  const rows = await prisma.teamMembership.findMany({
    where: { teamId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  const members: Member[] = rows.map((m) => ({
    id: m.userId,
    label: m.user.name?.trim().slice(0, 1).toUpperCase() || "M",
    status: deriveMemberStatus(m.userId, m.activity, m.lastSeenAt),
    avatar: m.user.avatar ?? null,
  }));

  const memberStatusCounts = members.reduce<Record<MemberStatus, number>>(
    (counts, m) => {
      counts[m.status] += 1;
      return counts;
    },
    { working: 0, resting: 0, offline: 0 },
  );

  return {
    memberCount: members.length,
    memberStatusCounts,
    members: members.slice(0, DISPLAY_LIMIT),
  };
}
