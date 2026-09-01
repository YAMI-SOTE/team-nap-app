import { z } from "zod";

const clockTime = z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM");

const fields = {
  bedtime: clockTime,
  wakeTime: clockTime,
  calendarConnected: z.boolean(),
  notificationsEnabled: z.boolean(),
};

/** Incremental save — any subset of the fields. */
export const updateOnboardingBody = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, "at least one field is required");

/** Finish onboarding — the sleep-rhythm answers are required. */
export const completeOnboardingBody = z.object({
  bedtime: clockTime,
  wakeTime: clockTime,
  calendarConnected: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
});
