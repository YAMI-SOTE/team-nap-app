import { api } from "@/services/api";

import type {
  CreateTeamPayload,
  HomeMemberStatusResponse,
  JoinTeamPayload,
  TeamFreeSlotsResponse,
  TeamRankingResponse,
  TeamSettingsResponse,
  TeamSummaryResponse,
} from "@/types/api";

/** `null` when the signed-in user has not joined a team yet. */
export async function getTeamSummary(): Promise<TeamSummaryResponse | null> {
  return api.get<TeamSummaryResponse | null>("/teams/summary");
}

/** Members ordered by rest score. `null` when not in a team. */
export async function getTeamRanking(): Promise<TeamRankingResponse | null> {
  return api.get<TeamRankingResponse | null>("/teams/ranking");
}

/**
 * Windows where the whole team is free on `date` (default: today).
 * `null` when not in a team; `slots` may be empty.
 */
export async function getTeamFreeSlots(
  date?: string,
): Promise<TeamFreeSlotsResponse | null> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return api.get<TeamFreeSlotsResponse | null>(`/teams/free-slots${qs}`);
}

export async function getSharedMemberStatus(): Promise<HomeMemberStatusResponse> {
  return api.get<HomeMemberStatusResponse>("/home/member-status");
}

export async function createTeam(
  payload: CreateTeamPayload,
): Promise<TeamSettingsResponse> {
  return api.post<TeamSettingsResponse>("/teams", payload);
}

export async function joinTeam(
  payload: JoinTeamPayload,
): Promise<TeamSettingsResponse> {
  return api.post<TeamSettingsResponse>("/teams/join", payload);
}

export async function renameTeam(name: string): Promise<TeamSettingsResponse> {
  return api.put<TeamSettingsResponse>("/teams", { name });
}

/** Broadcast a "let's nap together" suggestion to every other member. */
export async function suggestTeamNap(
  minutes: number,
): Promise<{ success: true; notified: number }> {
  return api.post<{ success: true; notified: number }>(
    "/teams/nap-suggestion",
    { minutes },
  );
}

/** "起きて〜" — nudge a teammate to wake up. */
export async function sendWakeNudge(memberId: string): Promise<void> {
  await api.post<{ success: true }>(
    `/teams/members/${encodeURIComponent(memberId)}/wake`,
    {},
  );
}

/** "休んでね" — nudge a teammate to take a break. */
export async function sendRestNudge(memberId: string): Promise<void> {
  await api.post<{ success: true }>(
    `/teams/members/${encodeURIComponent(memberId)}/rest`,
    {},
  );
}

/** Owner-only: remove a member from the team. */
export async function removeTeamMember(
  memberId: string,
): Promise<TeamSettingsResponse> {
  return api.del<TeamSettingsResponse>(
    `/teams/members/${encodeURIComponent(memberId)}`,
  );
}

/** Set the signed-in user's own activity. Ignored when not in a team. */
export async function setMyStatus(
  status: "online" | "resting",
): Promise<void> {
  try {
    await api.put("/teams/me/status", { status });
  } catch {
    /* not in a team (404) or offline — presence is best-effort */
  }
}
