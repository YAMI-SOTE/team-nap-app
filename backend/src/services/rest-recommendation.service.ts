import { jstNow } from "../lib/datetime.js";
import { listNaps } from "./naps.service.js";
import {
  decideRestTiming,
  type RestDecisionResult,
} from "./rest-decision.service.js";
import { getFreeTimesForDate } from "./schedule.service.js";
import { getSleepSchedule } from "./settings.service.js";

/**
 * ユーザーの実データから休息提案を生成する。
 *
 * 使用するデータ:
 * - 睡眠設定 → usualSleepStart
 * - 今日のNap履歴 → lastRestTime
 * - JST現在時刻 → currentTime
 * - 今日の予定 → freeTimes
 */
export async function getRestRecommendation(
  userId: string,
): Promise<RestDecisionResult> {
  const now = jstNow();

  const [sleepSchedule, naps] = await Promise.all([
    getSleepSchedule(userId),
    listNaps(userId),
  ]);

  // listNaps() は新しい順。
  // 今日のNapだけを対象にすることで、
  // lastRestTime === null を「今日はまだ休息していない」
  // という意味に統一する。
  const latestNapToday = naps.find(
    (nap) => nap.date === now.date,
  );

  const lastRestTime = latestNapToday?.end ?? null;

  const freeTimes = getFreeTimesForDate(
    now.date,
    now.time,
  );

  return decideRestTiming({
    usualSleepStart: sleepSchedule.bedtime,
    lastRestTime,
    currentTime: now.time,
    freeTimes,
  });
}