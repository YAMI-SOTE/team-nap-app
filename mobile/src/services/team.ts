import { api } from "@/services/api";

import type {
  CreateTeamPayload,
  HomeMemberStatusResponse,
  JoinTeamPayload,
  TeamSettingsResponse,
  TeamSummaryResponse,
} from "@/types/api";

/** `null` when the signed-in user has not joined a team yet. */
export async function getTeamSummary(): Promise<TeamSummaryResponse | null> {
  return api.get<TeamSummaryResponse | null>("/teams/summary");
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
