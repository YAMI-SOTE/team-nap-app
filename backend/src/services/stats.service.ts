import { calendarWeek, calendarWeekAgo, todayISO } from "../lib/datetime.js";
import { getHomeMemberStatus } from "./home.service.js";
import { getNapSummary, listNaps, type NapEntry } from "./naps.service.js";
import { hasTeam } from "./team.service.js";
import type { Member } from "../types/domain.js";

/**
 * Statistics — **all personal numbers are derived from real nap records**
 * (`naps.service`). With no records, every metric is 0 and `hasRecords`
 * is false so the client shows the "まだ仮眠の記録がありません" state.
 */

// 今週 = the calendar week, Sunday → Saturday (see lib/datetime calendarWeek).
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const STARS = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

export type StatFocus = { before: number; after: number; deltaPt: number };
/**
 * Weekly line-chart series, one entry per day Sun→Sat. Days that have not
 * happened yet this calendar week are `null` so the chart draws no marker
 * for them (the label still shows).
 */
type WeeklyCondition = { values: Array<number | null>; labels: string[] };

export type PersonalStatsResponse = {
  /** false when there are no nap records — client renders the empty state. */
  hasRecords: boolean;
  score: number;
  scoreMax: number;
  scoreDeltaLabel: string;
  focus: StatFocus;
  napCount: number;
  avgNapMinutes: number;
  wakeRating: number;
  condition: WeeklyCondition;
  recentNaps: Array<{ id: string; time: string; detail: string }>;
};

export type TeamStatsResponse = {
  hasRecords: boolean;
  achievementRate: number;
  achievedMemberLabel: string;
  achievementDeltaLabel: string;
  achievedMembers: Member[];
  focus: StatFocus;
  napCount: number;
  avgNapMinutes: number;
  everyoneNappedDays: number;
  condition: WeeklyCondition;
  achievementBanner: string;
  disclaimer: string;
};

const round = (n: number) => Math.round(n);
const avg = (xs: number[]) =>
  xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;

/** napCount·15 + avgWakeStars·8 + avgFocusDelta, clamped to 0–100. */
function restScore(entries: NapEntry[]): number {
  if (entries.length === 0) return 0;
  const raw =
    entries.length * 15 +
    avg(entries.map((n) => n.wakeStars)) * 8 +
    avg(entries.map((n) => n.focusDeltaPt));
  return Math.max(0, Math.min(100, round(raw)));
}

export async function getPersonalStats(
  userId: string,
): Promise<PersonalStatsResponse> {
  const summary = await getNapSummary(userId);
  const naps = await listNaps(userId);
  const hasRecords = naps.length > 0;

  // 今週 = the calendar week, Sunday → Saturday.
  const thisWeek = calendarWeek();
  const lastWeek = calendarWeekAgo(1);
  const inRange = (iso: string, r: { start: string; end: string }) =>
    iso >= r.start && iso <= r.end;
  const thisWeekNaps = naps.filter((n) => inRange(n.date, thisWeek));
  const lastWeekCount = naps.filter((n) => inRange(n.date, lastWeek)).length;

  // 仮眠前後の集中度 — all-time (a general indicator, not "今週").
  const avgDelta = round(avg(naps.map((n) => n.focusDeltaPt)));
  const before = hasRecords ? 50 : 0;

  const weekDelta = thisWeekNaps.length - lastWeekCount;
  const scoreDeltaLabel =
    !hasRecords || (thisWeekNaps.length === 0 && lastWeekCount === 0)
      ? ""
      : `先週より ${weekDelta >= 0 ? "+" : ""}${weekDelta}回`;

  // Weekly line: the individual's daily rest score (0–100) for each day
  // of this calendar week (Sun → Sat). Days with no nap are 0.
  const napsByDate = new Map<string, NapEntry[]>();
  for (const n of thisWeekNaps) {
    const list = napsByDate.get(n.date) ?? [];
    list.push(n);
    napsByDate.set(n.date, list);
  }
  // Only score days that have already occurred this week — future days
  // are null so the chart plots nothing for them.
  const today = todayISO();
  const conditionValues = thisWeek.days.map((iso) =>
    iso <= today ? restScore(napsByDate.get(iso) ?? []) : null,
  );

  return {
    hasRecords,
    // 今週の仮眠スコア: this week's naps, same formula as the daily points.
    score: restScore(thisWeekNaps),
    scoreMax: 100,
    scoreDeltaLabel,
    focus: { before, after: before + avgDelta, deltaPt: avgDelta },
    napCount: thisWeekNaps.length,
    avgNapMinutes: summary.avgMinutes,
    wakeRating: summary.avgWakeRating,
    condition: { values: conditionValues, labels: WEEKDAY_LABELS },
    recentNaps: naps.slice(0, 3).map((nap) => {
      const [m, d] = nap.date.split("-").slice(1).map(Number);
      return {
        id: nap.id,
        time: `${nap.start}〜${nap.end}`,
        detail: `${m}/${d} ・ ${nap.minutes}分 ・ 目覚め ${STARS(nap.wakeStars)}`,
      };
    }),
  };
}

export async function getTeamStats(
  userId: string,
): Promise<TeamStatsResponse> {
  const { members, memberCount } = await getHomeMemberStatus(userId);
  // No per-member nap aggregation exists yet — team nap metrics are 0.
  // Still null-out days that have not happened yet this week.
  const today = todayISO();
  const conditionValues = calendarWeek().days.map((iso) =>
    iso <= today ? 0 : null,
  );
  return {
    hasRecords: false,
    achievementRate: 0,
    achievedMemberLabel: `今週 0 / ${memberCount}人が目標達成`,
    achievementDeltaLabel: "",
    achievedMembers: members,
    focus: { before: 0, after: 0, deltaPt: 0 },
    napCount: 0,
    avgNapMinutes: 0,
    everyoneNappedDays: 0,
    condition: { values: conditionValues, labels: WEEKDAY_LABELS },
    achievementBanner: "",
    disclaimer:
      "チーム全体で休めているかを見る指標です。個人を比較するものではありません。",
  };
}

export async function getStats(userId: string): Promise<{
  personal: PersonalStatsResponse;
  team: TeamStatsResponse | null;
}> {
  const [personal, team] = await Promise.all([
    getPersonalStats(userId),
    // No team joined → the stats screen shows only the 個人 tab.
    hasTeam(userId).then((t) => (t ? getTeamStats(userId) : null)),
  ]);
  return { personal, team };
}
