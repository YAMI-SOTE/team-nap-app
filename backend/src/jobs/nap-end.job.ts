/**
 * Fires the「仮眠が終わりました」feed entry when a live nap session reaches
 * its planned wake time.
 *
 * The *alarm* itself is scheduled on the phone (see mobile
 * `scheduleNapEndAlarm`), because a local notification fires with the app
 * closed and the screen locked — which is the normal state of a napping
 * phone, and something a server push cannot be relied on for. This job is
 * what puts the event in the notification feed and tells the team the nap
 * is over, so push is deliberately suppressed: the device has already
 * rung, and a second alert for the same nap is worse than none.
 *
 * Deleting the session row is what makes this idempotent — a nap can only
 * be reported once, and `endNapSession` deleting it first simply means
 * there is nothing left to report.
 */

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { step } from "../lib/api-flow.js";
import { broadcastInvalidate } from "../realtime/hub.js";
import { addNotification } from "../services/notifications.service.js";
import { teamIdOf } from "../services/team-presence.service.js";

/** How often to look for naps that have reached their wake time. */
const CHECK_INTERVAL_MS = 30_000;

export async function runNapEndSweep(now: Date = new Date()): Promise<number> {
  const due = await prisma.napSession.findMany({
    where: { wakeAt: { lte: now } },
    select: { id: true, userId: true },
  });
  if (due.length === 0) return 0;

  for (const session of due) {
    // Claim the row first. If the delete matches nothing another worker
    // (or the user's own "end nap" call) got there first, so skip it —
    // this is what stops a duplicate notification.
    const claimed = await prisma.napSession.deleteMany({
      where: { id: session.id },
    });
    if (claimed.count === 0) continue;

    await addNotification(
      session.userId,
      {
        kind: "nap_ended",
        title: "仮眠の時間が終わりました",
        body: "おつかれさま。ふりかえりを記録して、次の休息に活かしましょう。",
      },
      // The phone's own scheduled alarm already sounded for this nap.
      { push: false },
    );

    const teamId = await teamIdOf(session.userId);
    if (teamId) broadcastInvalidate(teamId, "member");
  }

  step("service", "naps: wake time reached", { sessions: due.length });
  return due.length;
}

/** Start the interval. Returns a stop function (no-op under tests). */
export function startNapEndJob(): () => void {
  if (env.NODE_ENV === "test") return () => undefined;

  const timer = setInterval(() => {
    void runNapEndSweep().catch((error) => {
      console.error("nap-end sweep failed:", error);
    });
  }, CHECK_INTERVAL_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}
