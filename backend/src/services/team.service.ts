import { HttpError } from "../lib/http-error.js";
import type { Member, WeeklyBarState } from "../types/domain.js";

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

export function leaveTeam(): void {
  currentTeam = null;
}
