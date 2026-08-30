import { api } from "@/services/api";

import type {
  CreateNapPayload,
  NapEntryResponse,
  NapHistoryResponse,
} from "@/types/api";

export async function getNapHistory(): Promise<NapHistoryResponse> {
  return api.get<NapHistoryResponse>("/naps/history");
}

/**
 * Record a nap. The backend allows only one per calendar date and
 * responds 409 if that date already has one.
 */
export async function createNap(
  payload: CreateNapPayload,
): Promise<NapEntryResponse> {
  return api.post<NapEntryResponse>("/naps", payload);
}
