import { api } from "@/services/api";

import type { NapHistoryResponse } from "@/types/api";

export async function getNapHistory(): Promise<NapHistoryResponse> {
  return api.get<NapHistoryResponse>("/naps/history");
}
