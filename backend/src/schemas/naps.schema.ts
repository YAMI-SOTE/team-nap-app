import { z } from "zod";

import { todayISO } from "../lib/datetime.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください");
const clockTime = z.string().regex(/^\d{2}:\d{2}$/, "時刻は HH:MM 形式で入力してください");

/** `POST /naps` — record one nap. Defaults keep a minimal body usable. */
export const createNapBody = z.object({
  date: isoDate.default(() => todayISO()),
  start: clockTime,
  end: clockTime,
  minutes: z.number().int().positive(),
  wakeStars: z.number().int().min(0).max(5).default(3),
  focusDeltaPt: z.number().int().default(0),
});
