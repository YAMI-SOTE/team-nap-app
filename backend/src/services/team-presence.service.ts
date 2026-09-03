/**
 * Team roster + live activity snapshot. A leaf module (only Prisma +
 * domain types) so both `home.service` and the realtime hub can build the
 * same "member-status" payload without an import cycle.
 */

import { prisma } from "../lib/prisma.js";
import type { Member, MemberStatus } from "../types/domain.js";

/** Max member avatars returned for the Home / Team / Stats rosters. */
const DISPLAY_LIMIT = 6;

/** No activity for this long → the member reads as "offline". */
export const OFFLINE_AFTER_MS = 5 * 60_000;
/** `lastSeenAt` is bumped at most this often (per member). */
const SEEN_THROTTLE_MS = 90_000;

/**
 * A member's presence for the roster. `resting` is an explicit state the
 * member set (Rest screen → `PUT /teams/me/status`), so it always wins.
 * Otherwise: seen recently → `working`, stale / never → `offline`.
 */
export function deriveStatus(
  activity: "online" | "resting",
  lastSeenAt: Date | null,
): MemberStatus {
  if (activity === "resting") return "resting";
  if (!lastSeenAt || Date.now() - lastSeenAt.getTime() > OFFLINE_AFTER_MS) {
    return "offline";
  }
  return "working";
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
    status: deriveStatus(m.activity, m.lastSeenAt),
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
