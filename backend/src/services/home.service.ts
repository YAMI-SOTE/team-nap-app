import { prisma } from "../lib/prisma.js";
import { jstTodayLabel, timeUntil } from "../lib/datetime.js";
import { mapActivity } from "./team.service.js";
import type { Member, MemberStatus } from "../types/domain.js";
import { getNextFreeSlot } from "./schedule.service.js";
import { generateHomeComments } from "./ai.service.js";

type HomeSnapshot = {
  headline: [string, string];
  teamScore: number;
  aiAdvice: string;
};

export type HomeSummaryResponse = {
  todayLabel: string;
  headline: [string, string];
  /** `false` for a solo account — the Home screen then hides every team block. */
  hasTeam: boolean;
  /** `0` when `hasTeam` is false (the score/advice blocks are not shown). */
  teamScore: number;
  aiAdvice: string;
  teamScoreMax: number;
  /** `null` when there is no calendar / no computed free slot. */
  nextFree: {
    start: string;
    end: string;
    hoursUntilStart: number;
    minutesUntilStartRemainder: number;
    availableMemberCount: number;
  } | null;
};

export type HomeMemberStatusResponse = {
  memberCount: number;
  memberStatusCounts: Record<MemberStatus, number>;
  members: Member[];
};

export const TEAM_SCORE_MAX = 100;

//チームスコア判定ロジック
type TeamEvaluation = "good" | "normal" | "needs_improvement";

function evaluateTeamScore(teamScore: number): TeamEvaluation {
  if (teamScore >= 70) {
    return "good";
  }

  if (teamScore >= 50) {
    return "normal";
  }

  return "needs_improvement";
}

/** Max member avatars returned for the Home / Team / Stats member rows. */
const MEMBER_DISPLAY_LIMIT = 6;

// Placeholder team-score snapshot (still static — the real weekly score
// is not computed yet). Only used for accounts that belong to a team.
const homeSnapshot: HomeSnapshot = {
  headline: ["今日のチームは", "いい調子です"],
  teamScore: 20,
  aiAdvice: "AIアドバイスを表示する場所",
};

export async function getHomeSummary(
  userId: string,
): Promise<HomeSummaryResponse> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId },
  });
  const hasTeam = membership !== null;

  let nextFree: HomeSummaryResponse["nextFree"] = null;
  const freeSlot = getNextFreeSlot();
  if (hasTeam && freeSlot) {
    const untilStart = timeUntil(freeSlot.start, new Date());
    nextFree = {
      start: freeSlot.start,
      end: freeSlot.end,
      hoursUntilStart: untilStart.hours,
      minutesUntilStartRemainder: untilStart.minutes,
      availableMemberCount: freeSlot.availableMemberCount,
    };
  }

  // Solo account → no team score, no team AI advice, personal greeting only.
  if (!hasTeam) {
    return {
      todayLabel: jstTodayLabel(new Date()),
      headline: ["今日も", "おつかれさまです"],
      hasTeam: false,
      teamScore: 0,
      aiAdvice: "",
      teamScoreMax: TEAM_SCORE_MAX,
      nextFree: null,
    };
  }

  const teamEvaluation = evaluateTeamScore(homeSnapshot.teamScore);
  const homeComments = await generateHomeComments({
    teamScore: homeSnapshot.teamScore,
    teamEvaluation,
  });

  return {
    todayLabel: jstTodayLabel(new Date()),
    headline: homeComments.headline,
    hasTeam: true,
    teamScore: homeSnapshot.teamScore,
    aiAdvice: homeComments.aiAdvice,
    teamScoreMax: TEAM_SCORE_MAX,
    nextFree,
  };
}

export async function getHomeMemberStatus(
  userId: string,
): Promise<HomeMemberStatusResponse> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId },
  });

  // In a team → real teammates and their live activity.
  if (membership) {
    const rows = await prisma.teamMembership.findMany({
      where: { teamId: membership.teamId },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    });
    const members: Member[] = rows.map((m) => ({
      id: m.userId,
      label: m.user.name?.trim().slice(0, 1).toUpperCase() || "M",
      status: mapActivity(m.activity),
    }));
    return {
      memberCount: members.length,
      memberStatusCounts: countMemberStatuses(members),
      members: members.slice(0, MEMBER_DISPLAY_LIMIT),
    };
  }

  // Solo account → no roster at all. The Home screen hides the member block.
  return {
    memberCount: 0,
    memberStatusCounts: countMemberStatuses([]),
    members: [],
  };
}

function countMemberStatuses(members: Member[]): Record<MemberStatus, number> {
  return members.reduce<Record<MemberStatus, number>>(
    (counts, member) => {
      counts[member.status] += 1;
      return counts;
    },
    { working: 0, resting: 0, offline: 0 },
  );
}
