/**
 * Team roster + live activity snapshot. A leaf module (only Prisma +
 * domain types) so both `home.service` and the realtime hub can build the
 * same "member-status" payload without an import cycle.
 */

import { prisma } from "../lib/prisma.js";
import type { Member, MemberStatus } from "../types/domain.js";

/** Max member avatars returned for the Home / Team / Stats rosters. */
const DISPLAY_LIMIT = 6;

function toStatus(activity: "online" | "resting"): MemberStatus {
  return activity === "resting" ? "resting" : "working";
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
    status: toStatus(m.activity),
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
