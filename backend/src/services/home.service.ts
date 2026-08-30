import { jstTodayLabel, timeUntil } from "../lib/datetime.js";
import type { Member, MemberStatus } from "../types/domain.js";

type HomeSnapshot = {
  headline: [string, string];
  teamScore: number;
  aiAdvice: string;
  nextFreeStart: string;
  nextFreeEnd: string;
  availableMemberCount: number;
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

const homeSnapshot: HomeSnapshot = {
  headline: ["今日のチームは", "いい調子です"],
  teamScore: 20,
  aiAdvice: "AIアドバイスを表示する場所",
  nextFreeStart: "14:30",
  nextFreeEnd: "15:00",
  availableMemberCount: 5,
  members: [
    { id: "a", label: "A", status: "offline" },
    { id: "b", label: "B", status: "working" },
    { id: "c", label: "C", status: "resting" },
    { id: "d", label: "D", status: "working" },
    { id: "e", label: "E", status: "offline" },
    { id: "f", label: "F", status: "working" },
  ],
};

export function getHomeSummary(): HomeSummaryResponse {
  const untilStart = timeUntil(homeSnapshot.nextFreeStart, new Date());

  return {
    todayLabel: jstTodayLabel(new Date()),
    headline: homeSnapshot.headline,
    teamScore: homeSnapshot.teamScore,
    aiAdvice: homeSnapshot.aiAdvice,
    teamScoreMax: TEAM_SCORE_MAX,
    nextFree: {
      start: homeSnapshot.nextFreeStart,
      end: homeSnapshot.nextFreeEnd,
      hoursUntilStart: untilStart.hours,
      minutesUntilStartRemainder: untilStart.minutes,
      availableMemberCount: homeSnapshot.availableMemberCount,
    },
  };
}

export function getHomeMemberStatus(): HomeMemberStatusResponse {
  return {
    memberCount: homeSnapshot.members.length,
    memberStatusCounts: countMemberStatuses(homeSnapshot.members),
    members: homeSnapshot.members,
  };
}

function countMemberStatuses(
  members: Member[],
): Record<MemberStatus, number> {
  return members.reduce<Record<MemberStatus, number>>(
    (counts, member) => {
      counts[member.status] += 1;
      return counts;
    },
    { working: 0, resting: 0, offline: 0 },
  );
}
