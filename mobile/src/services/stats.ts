import { api } from "@/services/api";

import type {
  PersonalStatsResponse,
  StatsResponse,
  TeamStatsResponse,
} from "@/types/api";

/**
 * The stats screen needs both tabs, so it uses the combined `/stats`
 * endpoint (one round-trip). The split endpoints stay available for any
 * caller that only needs one side.
 */
export async function getStats(): Promise<StatsResponse> {
  return api.get<StatsResponse>("/stats");
}

export async function getPersonalStats(): Promise<PersonalStatsResponse> {
  return api.get<PersonalStatsResponse>("/stats/personal");
}

export async function getTeamStats(): Promise<TeamStatsResponse> {
  return api.get<TeamStatsResponse>("/stats/team");
}
