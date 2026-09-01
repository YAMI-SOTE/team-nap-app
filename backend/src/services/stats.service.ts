import { isoDateOffset } from "../lib/datetime.js";
import { getHomeMemberStatus } from "./home.service.js";
import { getNapSummary, listNaps, type NapEntry } from "./naps.service.js";
import { hasTeam } from "./team.service.js";
import type { Member } from "../types/domain.js";

/**
 * Statistics — **all personal numbers are derived from real nap records**
 * (`naps.service`). With no records, every metric is 0 and `hasRecords`
 * is false so the client shows the "まだ仮眠の記録がありません" state.
 */

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];
const STARS = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

export type StatFocus = { before: number; after: number; deltaPt: number };
type WeeklyCondition = { values: number[]; labels: string[] };

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

/** Mon–Sun of the week containing today, as "YYYY-MM-DD". */
function currentWeekDays(): string[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISO(d);
  });
}

export async function getPersonalStats(
  userId: string,
): Promise<PersonalStatsResponse> {
  const summary = await getNapSummary(userId);
  const naps = await listNaps(userId);
  const hasRecords = naps.length > 0;

  const avgDelta = round(avg(naps.map((n) => n.focusDeltaPt)));
  const before = hasRecords ? 50 : 0;

  // This week vs last week nap count → delta label.
  const thisWeekStart = isoDateOffset(-6);
  const lastWeekStart = isoDateOffset(-13);
  const lastWeekCount = naps.filter(
    (n) => n.date >= lastWeekStart && n.date < thisWeekStart,
  ).length;
  const weekDelta = summary.weekCount - lastWeekCount;
  const scoreDeltaLabel =
    !hasRecords || (summary.weekCount === 0 && lastWeekCount === 0)
      ? ""
      : `先週より ${weekDelta >= 0 ? "+" : ""}${weekDelta}回`;

  // Weekly line ("仮眠後の集中度"): for each day of the current week, the
  // average post-nap focus of that day's naps mapped to 0–100
  // (focusDeltaPt −20..+20 → 0..100). Days with no nap read as 0.
  const napsByDate = new Map<string, NapEntry[]>();
  for (const n of naps) {
    const list = napsByDate.get(n.date) ?? [];
    list.push(n);
    napsByDate.set(n.date, list);
  }
  const conditionValues = currentWeekDays().map((iso) => {
    const dayNaps = napsByDate.get(iso) ?? [];
    if (dayNaps.length === 0) return 0;
    const dayDelta = avg(dayNaps.map((n) => n.focusDeltaPt));
    return Math.max(0, Math.min(100, round(50 + dayDelta * 2.5)));
  });

  // Simple derived score from real activity (0–100).
  const score = hasRecords
    ? Math.min(
        100,
        round(summary.weekCount * 15 + summary.avgWakeRating * 8 + avgDelta),
      )
    : 0;

  return {
    hasRecords,
    score,
    scoreMax: 100,
    scoreDeltaLabel,
    focus: { before, after: before + avgDelta, deltaPt: avgDelta },
    napCount: summary.weekCount,
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
    condition: { values: [0, 0, 0, 0, 0, 0, 0], labels: WEEKDAY_LABELS },
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
