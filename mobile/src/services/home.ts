import { api } from "@/services/api";

import type { HomeSummaryResponse } from "@/types/api";

export async function getHomeSummary(): Promise<HomeSummaryResponse> {
  return api.get<HomeSummaryResponse>("/home/summary");
}
