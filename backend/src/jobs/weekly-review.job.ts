/**
 * Delivers the「先週のふりかえり」feed entry — the `weekly_review` kind that
 * the notifications screen has always had an icon for but that nothing
 * ever produced.
 *
 * Fires once per user per week, on Monday (JST) from `SEND_AFTER_HOUR`
 * onward, summarising the week that just ended (Sunday→Saturday, the same
 * window the stats screens use).
 *
 * Idempotency comes from the feed itself: a user whose last
 * `weekly_review` is less than `MIN_GAP_MS` old is skipped, so restarting
 * the process, a second instance, or several ticks inside one send window
 * cannot double-send. The gap is measured against the row's own age
 * rather than a computed week boundary — a boundary check silently stops
 * deduplicating whenever `now` and the stored `createdAt` fall on
 * opposite sides of it.
 */

import { env } from "../config/env.js";
import { calendarWeekAgo, jstNow } from "../lib/datetime.js";
import { prisma } from "../lib/prisma.js";
import { restScore } from "../lib/rest-score.js";
import { step } from "../lib/api-flow.js";
import { addNotification } from "../services/notifications.service.js";

/** Checked hourly; the day/hour guard below decides whether to send. */
const CHECK_INTERVAL_MS = 60 * 60_000;

/** Monday, so the review lands at the start of the working week. */
const SEND_ON_WEEKDAY = 1;
/** Local hour (JST) from which it is reasonable to notify. */
const SEND_AFTER_HOUR = 9;
/**
 * Minimum age of the last review before another may go out. Comfortably
 * longer than one send window and shorter than a week, so repeated ticks
 * on the same Monday are suppressed but the next Monday is not.
 */
const MIN_GAP_MS = 6 * 24 * 60 * 60_000;

/** Pure: is `now` inside the window where a weekly review may go out? */
export function isSendWindow(now: Date = new Date()): boolean {
  const { date, time } = jstNow(now);
  // `date` is the JST calendar day; read the weekday off it directly so
  // the process timezone cannot shift the answer.
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const hour = Number(time.slice(0, 2));
  return weekday === SEND_ON_WEEKDAY && hour >= SEND_AFTER_HOUR;
}

/**
 * Pure: may another review go out, given when the last one was written?
 *
 * Compares the row's own age rather than testing it against a computed
 * week boundary — the boundary version stopped deduplicating whenever
 * `now` and the stored `createdAt` landed on opposite sides of it.
 */
export function maySend(
  previousCreatedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (!previousCreatedAt) return true;
  return now.getTime() - previousCreatedAt.getTime() >= MIN_GAP_MS;
}

/** Pure: the copy for a week's numbers. Exported for tests. */
export function weeklyReviewBody(napCount: number, score: number): string {
  if (napCount === 0) {
    return "先週は仮眠の記録がありませんでした。今週は15分から始めてみませんか。";
  }
  return `先週は${napCount}回の仮眠、休息スコアは${score}点でした。今週もいいペースでいきましょう。`;
}

export async function runWeeklyReview(now: Date = new Date()): Promise<number> {
  if (!isSendWindow(now)) return 0;

  const lastWeek = calendarWeekAgo(1);
  const users = await prisma.user.findMany({ select: { id: true } });
  let sent = 0;

  for (const user of users) {
    const previous = await prisma.notification.findFirst({
      where: { userId: user.id, kind: "weekly_review" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (!maySend(previous?.createdAt ?? null, now)) continue;

    const naps = await prisma.napRecord.findMany({
      where: {
        userId: user.id,
        date: { gte: lastWeek.start, lte: lastWeek.end },
      },
      select: { wakeStars: true, focusDeltaPt: true },
    });

    await addNotification(user.id, {
      kind: "weekly_review",
      title: "先週のふりかえりが届きました",
      body: weeklyReviewBody(naps.length, restScore(naps)),
    });
    sent += 1;
  }

  if (sent > 0) step("service", "weekly review sent", { users: sent });
  return sent;
}

/** Start the interval. Returns a stop function (no-op under tests). */
export function startWeeklyReviewJob(): () => void {
  if (env.NODE_ENV === "test") return () => undefined;

  const timer = setInterval(() => {
    void runWeeklyReview().catch((error) => {
      console.error("weekly review failed:", error);
    });
  }, CHECK_INTERVAL_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}
