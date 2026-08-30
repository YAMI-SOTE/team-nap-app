import type {
  PersonalStatsResponse,
  TeamStatsResponse,
} from "@/types/api";

/**
 * Statistics data.
 *
 * No stats endpoint exists on the backend yet, so these return local
 * samples that match the Figma design. Swap the bodies for
 * `api.get("/stats/personal" | "/stats/team")` once the endpoints exist.
 */

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金"];

const PERSONAL_STATS: PersonalStatsResponse = {
  score: 87,
  scoreMax: 100,
  scoreDeltaLabel: "先週より +5 ↑",
  focus: { before: 62, after: 82, deltaPt: 20 },
  napCount: 5,
  avgNapMinutes: 18,
  wakeRating: 4.2,
  condition: { values: [58, 66, 72, 84, 80], labels: WEEKDAY_LABELS },
  recentNaps: [
    { id: "r1", time: "14:32〜14:47", detail: "8/21 ・ 15分 ・ 目覚め ★★★★☆" },
    { id: "r2", time: "13:50〜14:08", detail: "8/20 ・ 18分 ・ 目覚め ★★★★★" },
    { id: "r3", time: "14:05〜14:20", detail: "8/19 ・ 15分 ・ 目覚め ★★★★☆" },
  ],
};

const TEAM_STATS: TeamStatsResponse = {
  achievementRate: 82,
  achievedMemberLabel: "今週 9 / 11人が目標達成",
  achievementDeltaLabel: "+14% ↑",
  achievedMembers: [
    { id: "a", label: "A", status: "resting" },
    { id: "b", label: "B", status: "working" },
    { id: "c", label: "C", status: "working" },
    { id: "d", label: "D", status: "working" },
    { id: "e", label: "E", status: "resting" },
    { id: "f", label: "F", status: "resting" },
  ],
  focus: { before: 64, after: 82, deltaPt: 18 },
  napCount: 24,
  avgNapMinutes: 17,
  everyoneNappedDays: 3,
  condition: { values: [60, 64, 70, 80, 78], labels: WEEKDAY_LABELS },
  achievementBanner: "今週は全員が1日1回以上仮眠しました",
  disclaimer:
    "チーム全体で休めているかを見る指標です。個人を比較するものではありません。",
};

export async function getPersonalStats(): Promise<PersonalStatsResponse> {
  return PERSONAL_STATS;
}

export async function getTeamStats(): Promise<TeamStatsResponse> {
  return TEAM_STATS;
}
