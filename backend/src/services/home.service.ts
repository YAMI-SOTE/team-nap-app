type MemberStatus = "working" | "resting" | "offline";

type HomeMember = {
  id: string;
  label: string;
  status: MemberStatus;
};

type HomeSnapshot = {
  headline: [string, string];
  teamScore: number;
  aiAdvice: string;
  nextFreeStart: string;
  nextFreeEnd: string;
  availableMemberCount: number;
  members: HomeMember[];
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
  members: HomeMember[];
};

export const TEAM_SCORE_MAX = 100;

const HOME_TIMEZONE = "Asia/Tokyo";

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
  const timeUntilStart = getTimeUntilTime(homeSnapshot.nextFreeStart, new Date());

  return {
    todayLabel: formatTodayLabel(new Date()),
    headline: homeSnapshot.headline,
    teamScore: homeSnapshot.teamScore,
    aiAdvice: homeSnapshot.aiAdvice,
    teamScoreMax: TEAM_SCORE_MAX,
    nextFree: {
      start: homeSnapshot.nextFreeStart,
      end: homeSnapshot.nextFreeEnd,
      hoursUntilStart: timeUntilStart.hours,
      minutesUntilStartRemainder: timeUntilStart.minutes,
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
  members: HomeMember[],
): Record<MemberStatus, number> {
  return members.reduce<Record<MemberStatus, number>>(
    (counts, member) => {
      counts[member.status] += 1;
      return counts;
    },
    {
      working: 0,
      resting: 0,
      offline: 0,
    },
  );
}

function formatTodayLabel(date: Date): string {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: HOME_TIMEZONE,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const weekday = parts.find((part) => part.type === "weekday")?.value;

  return `${month}月${day}日 (${weekday})`;
}

function getTimeUntilTime(
  targetTime: string,
  now: Date,
): { hours: number; minutes: number } {
  const zonedNow = new Date(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: HOME_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(now).replace(",", ""),
  );

  const [hours, minutes] = targetTime.split(":").map(Number);
  const target = new Date(zonedNow);
  target.setHours(hours, minutes, 0, 0);

  let diffMinutes = Math.round((target.getTime() - zonedNow.getTime()) / 60000);

  if (diffMinutes < 0) {
    target.setDate(target.getDate() + 1);
    diffMinutes = Math.round((target.getTime() - zonedNow.getTime()) / 60000);
  }

  return {
    hours: Math.floor(diffMinutes / 60),
    minutes: diffMinutes % 60,
  };
}
