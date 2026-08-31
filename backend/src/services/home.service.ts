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
  members: Member[];
};

export type HomeSummaryResponse = {
  todayLabel: string;
  headline: [string, string];
  teamScore: number;
  aiAdvice: string;
  teamScoreMax: number;
  nextFree: {
    start: string;
    end: string;
    hoursUntilStart: number;
    minutesUntilStartRemainder: number;
    availableMemberCount: number;
  };
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

const homeSnapshot: HomeSnapshot = {
  headline: ["今日のチームは", "いい調子です"],
  teamScore: 20,
  aiAdvice: "AIアドバイスを表示する場所",
  members: [
    { id: "a", label: "A", status: "offline" },
    { id: "b", label: "B", status: "working" },
    { id: "c", label: "C", status: "resting" },
    { id: "d", label: "D", status: "working" },
    { id: "e", label: "E", status: "offline" },
    { id: "f", label: "F", status: "working" },
    { id: "g", label: "G", status: "resting" },
    { id: "h", label: "H", status: "working" },
  ],
};

export async function getHomeSummary(): Promise<HomeSummaryResponse> {
  const freeSlot = getNextFreeSlot();
  const untilStart = timeUntil(freeSlot.start, new Date());

  const teamEvaluation = evaluateTeamScore(homeSnapshot.teamScore);

  const homeComments = await generateHomeComments({
    teamScore: homeSnapshot.teamScore,
    teamEvaluation,
  });

  return {
    todayLabel: jstTodayLabel(new Date()),
    headline: homeComments.headline,
    teamScore: homeSnapshot.teamScore,
    aiAdvice: homeComments.aiAdvice,
    teamScoreMax: TEAM_SCORE_MAX,
    nextFree: {
      start: freeSlot.start,
      end: freeSlot.end,
      hoursUntilStart: untilStart.hours,
      minutesUntilStartRemainder: untilStart.minutes,
      availableMemberCount: freeSlot.availableMemberCount,
    },
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

  // No team → the static Home-tab roster.
  return {
    memberCount: homeSnapshot.members.length,
    memberStatusCounts: countMemberStatuses(homeSnapshot.members),
    members: homeSnapshot.members.slice(0, MEMBER_DISPLAY_LIMIT),
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
