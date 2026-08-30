import { z } from "zod";

import { todayISO } from "../lib/datetime.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const clockTime = z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM");

/**
 * Event create/update body. Defaults mirror the old
 * `normalizeDraft` helper so a partial body still resolves to a full
 * draft rather than 400-ing.
 */
export const eventDraftBody = z.object({
  title: z.string().default(""),
  date: isoDate.default(() => todayISO()),
  start: clockTime.default("10:00"),
  end: clockTime.default("11:00"),
  allDay: z.boolean().default(false),
});

export const eventIdParams = z.object({
  id: z.string().min(1),
});

export const dayScheduleQuery = z.object({
  date: isoDate.optional(),
});
