/**
 * Sleep-window validation shared by the onboarding and settings schemas.
 * The server enforces the same rule the mobile screen shows: the time
 * from bedtime to wake time (wrapping past midnight) must be a sensible
 * night, i.e. more than 0 and at most 16 hours.
 */

const MAX_SLEEP_MINUTES = 16 * 60;

/** Minutes from `bedtime` to `wakeTime`, wrapping past midnight. */
export function sleepWindowMinutes(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let minutes = wh * 60 + wm - (bh * 60 + bm);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes;
}

export function isValidSleepWindow(bedtime: string, wakeTime: string): boolean {
  const minutes = sleepWindowMinutes(bedtime, wakeTime);
  return minutes > 0 && minutes <= MAX_SLEEP_MINUTES;
}

export const SLEEP_WINDOW_MESSAGE =
  "就寝から起床までが 16 時間以内になるよう入力してください";
