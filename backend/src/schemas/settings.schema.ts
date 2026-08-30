import { z } from "zod";

const clockTime = z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM");

export const accountSettingsBody = z.object({
  username: z.string(),
  email: z.string(),
});

export const notificationSettingsBody = z
  .object({
    napSuggestion: z.boolean(),
    napEnd: z.boolean(),
    teamNapSuggestion: z.boolean(),
    wakeSupport: z.boolean(),
  })
  .partial();

export const sleepScheduleBody = z.object({
  bedtime: clockTime,
  wakeTime: clockTime,
});
