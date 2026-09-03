import { z } from "zod";

/**
 * `PUT /rest/session` — start or refresh the caller's live nap session.
 * `plannedMinutes` is the timer length; the backend derives `wakeAt`.
 */
export const napSessionBody = z.object({
  plannedMinutes: z.number().int().min(1).max(180).default(15),
});
