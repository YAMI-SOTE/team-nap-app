import { getHomeMemberStatus } from "./home.service.js";
import { getNapSummary, listNaps } from "./naps.service.js";

/**
 * Statistics. Personal numbers are derived from `naps.service`; team
 * numbers reuse `home.service`'s member roster — both so the stats stay
 * consistent with the rest of the app and there is one place to change.
 */

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金"];
const STARS = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

export type StatFocus = { before: number; after: number; deltaPt: number };
type WeeklyCondition = { values: number[]; labels: string[] };

export type PersonalStatsResponse = {
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
  achievementRate: number;
  achievedMemberLabel: string;
  achievementDeltaLabel: string;
  achievedMembers: Array<{ id: string; label: string; status: string }>;
  focus: StatFocus;
  napCount: number;
  avgNapMinutes: number;
  everyoneNappedDays: number;
  condition: WeeklyCondition;
  achievementBanner: string;
  disclaimer: string;
};

export function getPersonalStats(): PersonalStatsResponse {
  const summary = getNapSummary();
  const naps = listNaps();
  const avgDelta =
    naps.length > 0
      ? Math.round(
          naps.reduce((sum, n) => sum + n.focusDeltaPt, 0) / naps.length,
        )
      : 0;
  const before = 62;

  return {
    score: 87,
    scoreMax: 100,
    scoreDeltaLabel: "先週より +5 ↑",
    focus: { before, after: before + avgDelta, deltaPt: avgDelta },
    napCount: summary.weekCount,
    avgNapMinutes: summary.avgMinutes,
    wakeRating: summary.avgWakeRating,
    condition: { values: [58, 66, 72, 84, 80], labels: WEEKDAY_LABELS },
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

export function getTeamStats(): TeamStatsResponse {
  const { members, memberCount } = getHomeMemberStatus();
  const achievementRate = 82;
  const achieved = Math.round((memberCount * achievementRate) / 100);
  const before = 64;
  const deltaPt = 18;

  return {
    achievementRate,
    achievedMemberLabel: `今週 ${achieved} / ${memberCount}人が目標達成`,
    achievementDeltaLabel: "+14% ↑",
    achievedMembers: members,
    focus: { before, after: before + deltaPt, deltaPt },
    napCount: 24,
    avgNapMinutes: 17,
    everyoneNappedDays: 3,
    condition: { values: [60, 64, 70, 80, 78], labels: WEEKDAY_LABELS },
    achievementBanner: "今週は全員が1日1回以上仮眠しました",
    disclaimer:
      "チーム全体で休めているかを見る指標です。個人を比較するものではありません。",
  };
}

export function getStats() {
  return {
    personal: getPersonalStats(),
    team: getTeamStats(),
  };
}
