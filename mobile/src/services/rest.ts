import { api } from "@/services/api";

export type RestReasonCode =
  | "REST_RECOMMENDED"
  | "RECENTLY_RESTED"
  | "NO_FREE_TIME"
  | "TOO_LATE"
  | "NO_REST_NEEDED";

export type RestDecisionResponse = {
  shouldRest: boolean;
  needScore: number;
  recommendedMinutes: number | null;
  recommendedStart: string | null;
  recommendedEnd: string | null;
  reasonCode: RestReasonCode;
};

export async function getRestRecommendation(): Promise<RestDecisionResponse> {
  return api.post<RestDecisionResponse>("/rest/decision", {});
}