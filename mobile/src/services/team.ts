import { api } from "@/services/api";

import type {
  HomeMemberStatusResponse,
  TeamSummaryResponse,
} from "@/types/api";

export async function getTeamSummary(): Promise<TeamSummaryResponse> {
  return api.get<TeamSummaryResponse>("/teams/summary");
}

export async function getSharedMemberStatus(): Promise<HomeMemberStatusResponse> {
  return api.get<HomeMemberStatusResponse>("/home/member-status");
}
