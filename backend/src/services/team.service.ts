import { HttpError } from "../lib/http-error.js";
import type { Member, MemberStatus, WeeklyBarState } from "../types/domain.js";

// ---------------------------------------------------------------------------
// Team dashboard (今週の Team Nap) — static snapshot, only meaningful while
// the user belongs to a team.
// ---------------------------------------------------------------------------

type TeamWeeklyBar = {
  label: string;
  ratio: number;
  state: WeeklyBarState;
};

export type TeamSummaryResponse = {
  weekly: {
    ratePercent: number;
    deltaPercent: number;
    bars: TeamWeeklyBar[];
  };
  suggestion: {
    headline: [string, string];
    body: string;
    napMinutes: number;
  };
  achievement: string;
};

const teamSummarySnapshot: TeamSummaryResponse = {
  weekly: {
    ratePercent: 31,
    deltaPercent: 14,
    bars: [
      { label: "月", ratio: 0.67, state: "past" },
      { label: "火", ratio: 0.75, state: "past" },
      { label: "水", ratio: 0.83, state: "past" },
      { label: "木", ratio: 0.1, state: "past" },
      { label: "金", ratio: 0.79, state: "today" },
      { label: "土", ratio: 0.12, state: "future" },
      { label: "日", ratio: 0.12, state: "future" },
    ],
  },
  suggestion: {
    headline: ["チームは長時間", "がんばっています"],
    body: "いっしょにリフレッシュしませんか？",
    napMinutes: 15,
  },
  achievement: "今週は全員が1日1回以上仮眠しました",
};

// ---------------------------------------------------------------------------
// Current team membership. Single source of truth — `settings.service`
// reads this for the "チーム設定" screen. `null` means the user has not
// joined a team yet (Team tab shows the empty state).
// ---------------------------------------------------------------------------

export type TeamSettingsResponse = {
  teamName: string;
  memberCount: number;
  inviteCode: string;
  members: Member[];
};

type Team = {
  teamName: string;
  inviteCode: string;
  members: Member[];
};

/** The one team a join code resolves to in this mock. */
const seedTeam: Team = {
  teamName: "TEAM NAP 開発チーム",
  inviteCode: "NAP-4821",
  members: [
    { id: "a", label: "A", status: "resting" },
    { id: "b", label: "B", status: "working" },
    { id: "c", label: "C", status: "working" },
    { id: "d", label: "D", status: "working" },
    { id: "e", label: "E", status: "resting" },
    { id: "f", label: "F", status: "offline" },
  ],
};

let currentTeam: Team | null = { ...seedTeam, members: [...seedTeam.members] };

function toSettings(team: Team): TeamSettingsResponse {
  return {
    teamName: team.teamName,
    memberCount: team.members.length,
    inviteCode: team.inviteCode,
    members: team.members,
  };
}

function generateInviteCode(): string {
  return `NAP-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function getTeamSummary(): TeamSummaryResponse | null {
  return currentTeam ? teamSummarySnapshot : null;
}

export function getCurrentTeam(): TeamSettingsResponse | null {
  return currentTeam ? toSettings(currentTeam) : null;
}

export function createTeam(name: string): TeamSettingsResponse {
  if (currentTeam) {
    throw HttpError.conflict("You already belong to a team");
  }
  currentTeam = {
    teamName: name,
    inviteCode: generateInviteCode(),
    members: [
      { id: "me", label: name.trim().slice(0, 1).toUpperCase() || "M", status: "working" },
    ],
  };
  return toSettings(currentTeam);
}

/** Compare codes on their alphanumerics only, so "NAP-4821" == "nap4821". */
function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function joinTeam(inviteCode: string): TeamSettingsResponse {
  if (currentTeam) {
    throw HttpError.conflict("You already belong to a team");
  }
  if (normalizeCode(inviteCode) !== normalizeCode(seedTeam.inviteCode)) {
    throw HttpError.notFound("Invalid invite code");
  }
  currentTeam = { ...seedTeam, members: [...seedTeam.members] };
  return toSettings(currentTeam);
}

export function renameTeam(name: string): TeamSettingsResponse {
  if (!currentTeam) {
    throw HttpError.notFound("No team to rename");
  }
  currentTeam = { ...currentTeam, teamName: name };
  return toSettings(currentTeam);
}

export function leaveTeam(): void {
  currentTeam = null;
}

// ---------------------------------------------------------------------------
// 仮眠上手ランキング — members ordered by their weekly rest score
// (Figma "S04-02_Ranking", node 252:519).
// ---------------------------------------------------------------------------

export type TeamRankingEntry = {
  id: string;
  name: string;
  label: string;
  status: MemberStatus;
  score: number;
};

export type TeamRankingResponse = {
  memberCount: number;
  /** Highest score first. */
  entries: TeamRankingEntry[];
};

const rankingSnapshot: TeamRankingEntry[] = [
  { id: "m-a", name: "メンバーA", label: "A", status: "resting", score: 92 },
  { id: "m-b", name: "メンバーB", label: "B", status: "working", score: 88 },
  { id: "m-c", name: "メンバーC", label: "C", status: "offline", score: 76 },
  { id: "m-d", name: "メンバーD", label: "D", status: "working", score: 64 },
  { id: "m-e", name: "メンバーE", label: "E", status: "resting", score: 58 },
  { id: "m-f", name: "メンバーF", label: "F", status: "working", score: 55 },
  { id: "m-g", name: "メンバーG", label: "G", status: "offline", score: 51 },
  { id: "m-h", name: "メンバーH", label: "H", status: "working", score: 48 },
  { id: "m-i", name: "メンバーI", label: "I", status: "resting", score: 44 },
  { id: "m-j", name: "メンバーJ", label: "J", status: "working", score: 40 },
  { id: "m-k", name: "メンバーK", label: "K", status: "offline", score: 36 },
];

export function getTeamRanking(): TeamRankingResponse | null {
  if (!currentTeam) {
    return null;
  }
  const entries = [...rankingSnapshot].sort((a, b) => b.score - a.score);
  return { memberCount: entries.length, entries };
}
