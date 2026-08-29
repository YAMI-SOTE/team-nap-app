import { api } from "@/services/api";

import type { MemberDetailResponse } from "@/types/api";

export async function getMemberDetail(
  id: string,
): Promise<MemberDetailResponse> {
  return api.get<MemberDetailResponse>(
    `/teams/members/${encodeURIComponent(id)}`,
  );
}
