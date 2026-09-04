/**
 * Weekly team nap aggregation — the single source of the numbers behind
 * the Team stats page, the 仮眠上手ランキング, the 今週の Team Nap summary,
 * and the Home team score. All derived from real `NapRecord` rows for the
 * team's members, for the Sunday→Saturday calendar week.
 *
 * Leaf module (Prisma + datetime + rest-score only) so `team.service`,
 * `home.service` and `stats.service` can all use it without an import
 * cycle.
 */

import { prisma } from "../lib/prisma.js";
import {
  calendarWeek,
  calendarWeekAgo,
  todayISO,
} from "../lib/datetime.js";
import { restScore } from "../lib/rest-score.js";
import { deriveMemberStatus } from "./team-presence.service.js";
import type { MemberStatus } from "../types/domain.js";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function initial(name: string | null): string {
  return name?.trim().slice(0, 1).toUpperCase() || "M";
}

export type NapRow = {
  userId: string;
  /** "YYYY-MM-DD" */
  date: string;
  minutes: number;
  wakeStars: number;
  focusDeltaPt: number;
};

export type MemberInput = {
  userId: string;
  name: string | null;
  avatar: string | null;
  status: MemberStatus;
};

export type MemberWeek = MemberInput & {
  label: string;
  napCount: number;
  totalMinutes: number;
  /** 0–100 rest score for the member's whole week. */
  score: number;
  /** true when the member recorded at least one nap this week. */
  achieved: boolean;
  /** 7 entries Sun→Sat; `null` for days that have not happened yet. */
  dailyScore: Array<number | null>;
};

export type TeamWeek = {
  /** 7 ISO dates Sun→Sat. */
  weekDays: string[];
  weekdayLabels: string[];
  members: MemberWeek[];
  memberCount: number;
  napCount: number;
  totalMinutes: number;
  avgNapMinutes: number;
  /** Baseline concentration (50 when there are naps, else 0) — matches personal stats. */
  focusBefore: number;
  focusDeltaPt: number;
  /** 0–100, average of the member week scores. */
  teamScore: number;
  achievedCount: number;
  /** achievedCount / memberCount, as a 0–100 percentage. */
  achievementRate: number;
  /** Days this week where every member recorded a nap. */
  everyoneNappedDays: number;
  /** 7 entries Sun→Sat; team-average daily score, `null` for future days. */
  dailyTeamScore: Array<number | null>;
  /** 7 entries Sun→Sat; fraction (0–1) of members who napped that day. */
  dailyNapRate: number[];
  hasRecords: boolean;
};

/** Pure aggregation — no DB. Exposed for unit tests. */
export function aggregateTeamWeek(input: {
  members: MemberInput[];
  naps: NapRow[];
  weekDays: string[];
  today: string;
}): TeamWeek {
  const { members: memberInputs, naps, weekDays, today } = input;

  const byUser = new Map<string, NapRow[]>();
  for (const n of naps) {
    const arr = byUser.get(n.userId) ?? [];
    arr.push(n);
    byUser.set(n.userId, arr);
  }

  const members: MemberWeek[] = memberInputs.map((m) => {
    const mine = byUser.get(m.userId) ?? [];
    const byDate = new Map<string, NapRow[]>();
    for (const n of mine) {
      const arr = byDate.get(n.date) ?? [];
      arr.push(n);
      byDate.set(n.date, arr);
    }
    const dailyScore = weekDays.map((iso) =>
      iso <= today ? restScore(byDate.get(iso) ?? []) : null,
    );
    return {
      ...m,
      label: initial(m.name),
      napCount: mine.length,
      totalMinutes: mine.reduce((s, n) => s + n.minutes, 0),
      score: restScore(mine),
      achieved: mine.length > 0,
      dailyScore,
    };
  });

  const memberCount = members.length;
  const napCount = members.reduce((s, m) => s + m.napCount, 0);
  const totalMinutes = members.reduce((s, m) => s + m.totalMinutes, 0);
  const avgNapMinutes = napCount ? Math.round(totalMinutes / napCount) : 0;
  const focusDeltaPt = naps.length
    ? Math.round(naps.reduce((s, n) => s + n.focusDeltaPt, 0) / naps.length)
    : 0;
  const hasRecords = napCount > 0;
  const focusBefore = hasRecords ? 50 : 0;

  const teamScore = memberCount
    ? Math.round(members.reduce((s, m) => s + m.score, 0) / memberCount)
    : 0;
  const achievedCount = members.filter((m) => m.achieved).length;
  const achievementRate = memberCount
    ? Math.round((achievedCount / memberCount) * 100)
    : 0;

  const dailyNapRate = weekDays.map((iso) => {
    if (memberCount === 0) return 0;
    const napped = members.filter((m) =>
      (byUser.get(m.userId) ?? []).some((n) => n.date === iso),
    ).length;
    return napped / memberCount;
  });
  const everyoneNappedDays = weekDays.filter(
    (iso, i) => iso <= today && memberCount > 0 && dailyNapRate[i] === 1,
  ).length;
  const dailyTeamScore = weekDays.map((iso, i) =>
    iso <= today && memberCount
      ? Math.round(
          members.reduce((s, m) => s + (m.dailyScore[i] ?? 0), 0) / memberCount,
        )
      : null,
  );

  return {
    weekDays,
    weekdayLabels: WEEKDAY_LABELS,
    members,
    memberCount,
    napCount,
    totalMinutes,
    avgNapMinutes,
    focusBefore,
    focusDeltaPt,
    teamScore,
    achievedCount,
    achievementRate,
    everyoneNappedDays,
    dailyTeamScore,
    dailyNapRate,
    hasRecords,
  };
}

/** Load the team's members + this-week (or `weeksAgo`) naps and aggregate. */
export async function teamWeek(
  teamId: string,
  weeksAgo = 0,
): Promise<TeamWeek> {
  const week = weeksAgo === 0 ? calendarWeek() : calendarWeekAgo(weeksAgo);

  const memberships = await prisma.teamMembership.findMany({
    where: { teamId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  const memberIds = memberships.map((m) => m.userId);
  const naps: NapRow[] = memberIds.length
    ? await prisma.napRecord.findMany({
        where: {
          userId: { in: memberIds },
          date: { gte: week.start, lte: week.end },
        },
        select: {
          userId: true,
          date: true,
          minutes: true,
          wakeStars: true,
          focusDeltaPt: true,
        },
      })
    : [];

  return aggregateTeamWeek({
    members: memberships.map((m) => ({
      userId: m.userId,
      name: m.user.name?.trim() || null,
      avatar: m.user.avatar ?? null,
      status: deriveMemberStatus(m.userId, m.activity, m.lastSeenAt),
    })),
    naps,
    weekDays: week.days,
    today: todayISO(),
  });
}
