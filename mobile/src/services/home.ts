import { api } from "@/services/api";

import type {
  HomeMemberStatusResponse,
  HomeSummaryResponse,
} from "@/types/api";

export async function getHomeSummary(): Promise<HomeSummaryResponse> {
  return api.get<HomeSummaryResponse>("/home/summary");
}

export async function getHomeMemberStatus(): Promise<HomeMemberStatusResponse> {
  return api.get<HomeMemberStatusResponse>("/home/member-status");
}
