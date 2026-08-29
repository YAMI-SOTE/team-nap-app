import type { TeamSummaryResponse } from "@/types/api";

/**
 * Team screen data.
 *
 * The backend team router is not enabled yet (see backend
 * `routes/index.ts`), so this returns a local snapshot that matches the
 * Figma design. Swap the body for `api.get<TeamSummaryResponse>("/teams/summary")`
 * once the endpoint exists — the shape is already aligned with the
 * `/home/summary` conventions.
 */
const teamSummarySnapshot: TeamSummaryResponse = {
  weekly: {
    ratePercent: 82,
    deltaPercent: 14,
    bars: [
      { label: "月", ratio: 0.67, state: "past" },
      { label: "火", ratio: 0.75, state: "past" },
      { label: "水", ratio: 0.83, state: "past" },
      { label: "木", ratio: 0.9, state: "past" },
      { label: "金", ratio: 0.79, state: "today" },
      { label: "土", ratio: 0.12, state: "future" },
      { label: "日", ratio: 0.12, state: "future" },
    ],
  },
  statusCounts: { working: 3, resting: 2, offline: 1 },
  suggestion: {
    headline: ["チームは長時間", "がんばっています"],
    body: "いっしょにリフレッシュしませんか？",
    napMinutes: 15,
  },
  achievement: "今週は全員が1日1回以上仮眠しました",
  memberCount: 6,
  members: [
    { id: "a", label: "A", status: "resting" },
    { id: "b", label: "B", status: "working" },
    { id: "c", label: "C", status: "working" },
    { id: "d", label: "D", status: "working" },
    { id: "e", label: "E", status: "resting" },
    { id: "f", label: "F", status: "offline" },
  ],
};

export async function getTeamSummary(): Promise<TeamSummaryResponse> {
  return teamSummarySnapshot;
}
