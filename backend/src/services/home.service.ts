import { prisma } from "../lib/prisma.js";
import { jstNow, jstTodayLabel, timeUntil } from "../lib/datetime.js";
import type { Member, MemberStatus } from "../types/domain.js";
import {
  EMPTY_SNAPSHOT,
  teamIdOf,
  teamMemberStatus,
} from "./team-presence.service.js";
import { teamWeek } from "./team-nap-stats.service.js";
import { getNextFreeSlot } from "./schedule.service.js";
import { generateHomeComments } from "./ai.service.js";

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

export async function getHomeSummary(
  userId: string,
): Promise<HomeSummaryResponse> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId },
  });
  const hasTeam = membership !== null;

  let nextFree: HomeSummaryResponse["nextFree"] = null;
  const now = jstNow();
  const freeSlot = hasTeam
    ? await getNextFreeSlot(userId, now.date, now.time)
    : null;
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

  // Real weekly team score from the members' NapRecord rows.
  const teamScore = (await teamWeek(membership.teamId)).teamScore;
  const teamEvaluation = evaluateTeamScore(teamScore);
  const homeComments = await generateHomeComments({
    teamScore,
    teamEvaluation,
  });

  return {
    todayLabel: jstTodayLabel(new Date()),
    headline: homeComments.headline,
    hasTeam: true,
    teamScore,
    aiAdvice: homeComments.aiAdvice,
    teamScoreMax: TEAM_SCORE_MAX,
    nextFree,
  };
}

export async function getHomeMemberStatus(
  userId: string,
): Promise<HomeMemberStatusResponse> {
  const teamId = await teamIdOf(userId);
  // In a team → real teammates + live activity. Solo → empty (Home hides
  // the member block). Same snapshot the realtime hub broadcasts.
  return teamId ? teamMemberStatus(teamId) : EMPTY_SNAPSHOT;
}
