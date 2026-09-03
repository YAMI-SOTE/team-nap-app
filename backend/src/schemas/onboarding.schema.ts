import { z } from "zod";

import {
  SLEEP_WINDOW_MESSAGE,
  isValidSleepWindow,
} from "../lib/sleep-window.js";

const clockTime = z.string().regex(/^\d{2}:\d{2}$/, "時刻は HH:MM 形式で入力してください");
const avatar = z
  .enum(["cat", "man", "woman"], { error: "アイコンの選択が正しくありません" })
  .nullable();

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
  .refine((v) => Object.keys(v).length > 0, "変更する項目を入力してください")
  .refine(
    (v) =>
      v.bedtime === undefined ||
      v.wakeTime === undefined ||
      isValidSleepWindow(v.bedtime, v.wakeTime),
    { message: SLEEP_WINDOW_MESSAGE, path: ["wakeTime"] },
  );

/** Finish onboarding — the sleep-rhythm answers are required. */
export const completeOnboardingBody = z
  .object({
    bedtime: clockTime,
    wakeTime: clockTime,
    calendarConnected: z.boolean().optional(),
    notificationsEnabled: z.boolean().optional(),
    avatar: avatar.optional(),
  })
  .refine((v) => isValidSleepWindow(v.bedtime, v.wakeTime), {
    message: SLEEP_WINDOW_MESSAGE,
    path: ["wakeTime"],
  });
