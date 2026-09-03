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

/**
 * Start / refresh the live nap session so teammates see the
 * "仮眠の状況 / あと◯分" card. Best-effort — silently ignored when the
 * user is not in a team or offline.
 */
export async function startNapSession(plannedMinutes: number): Promise<void> {
  try {
    await api.put("/rest/session", { plannedMinutes });
  } catch {
    /* not in a team / offline — the card is best-effort */
  }
}

/** End the live nap session (timer finished / cancelled / screen left). */
export async function endNapSession(): Promise<void> {
  try {
    await api.del("/rest/session");
  } catch {
    /* best-effort */
  }
}