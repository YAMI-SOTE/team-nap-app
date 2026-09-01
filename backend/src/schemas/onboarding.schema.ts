import { z } from "zod";

const clockTime = z.string().regex(/^\d{2}:\d{2}$/, "時刻は HH:MM 形式で入力してください");

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
  .refine((v) => Object.keys(v).length > 0, "変更する項目を入力してください");

/** Finish onboarding — the sleep-rhythm answers are required. */
export const completeOnboardingBody = z.object({
  bedtime: clockTime,
  wakeTime: clockTime,
  calendarConnected: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
});
