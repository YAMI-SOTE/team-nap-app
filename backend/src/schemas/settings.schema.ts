import { z } from "zod";

import {
  SLEEP_WINDOW_MESSAGE,
  isValidSleepWindow,
} from "../lib/sleep-window.js";

const clockTime = z.string().regex(/^\d{2}:\d{2}$/, "時刻は HH:MM 形式で入力してください");

export const notificationSettingsBody = z
  .object({
    napSuggestion: z.boolean(),
    napEnd: z.boolean(),
    teamNapSuggestion: z.boolean(),
    wakeSupport: z.boolean(),
  })
  .partial();

export const sleepScheduleBody = z
  .object({
    bedtime: clockTime,
    wakeTime: clockTime,
  })
  .refine((v) => isValidSleepWindow(v.bedtime, v.wakeTime), {
    message: SLEEP_WINDOW_MESSAGE,
    path: ["wakeTime"],
  });
