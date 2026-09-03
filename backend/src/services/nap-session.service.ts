/**
 * Live nap sessions — a nap that has been started but not yet finished.
 * Backs the "仮眠の状況 / あと◯分" card on a teammate's detail screen
 * (`member.service`). At most one per user.
 *
 *   start  → upsert a row (startedAt now, wakeAt = now + plannedMinutes)
 *   end    → delete the row (idempotent)
 *   active → the row, unless it was left dangling (see STALE_GRACE_MS)
 *
 * Leaf module (Prisma + datetime only).
 */

import { prisma } from "../lib/prisma.js";
import { jstNow } from "../lib/datetime.js";

/**
 * A session whose `wakeAt` is more than this far in the past is assumed
 * to have been abandoned (the app was killed mid-nap, so `end` never
 * fired). It is treated as ended and cleaned up on the next read.
 */
const STALE_GRACE_MS = 30 * 60_000;

const MIN_MINUTES = 1;
const MAX_MINUTES = 180;

export type ActiveNap = {
  /** Planned wake time, "HH:MM" in Asia/Tokyo. */
  wakeAt: string;
  /** Whole minutes until `wakeAt`, floored at 0. */
  minutesRemaining: number;
};

/**
 * Pure part of `activeNapSession`: given the row's `wakeAt` and "now",
 * decide whether the session still counts and, if so, its remaining
 * minutes. `null` → stale / abandoned. Exported for tests.
 */
export function describeActiveNap(
  wakeAt: Date,
  now: Date = new Date(),
): { minutesRemaining: number; stale: boolean } | null {
  const stale = now.getTime() > wakeAt.getTime() + STALE_GRACE_MS;
  if (stale) return null;
  return {
    minutesRemaining: Math.max(
      0,
      Math.ceil((wakeAt.getTime() - now.getTime()) / 60_000),
    ),
    stale,
  };
}

export async function startNapSession(
  userId: string,
  plannedMinutes: number,
): Promise<void> {
  const minutes = Math.min(
    MAX_MINUTES,
    Math.max(MIN_MINUTES, Math.round(plannedMinutes)),
  );
  const startedAt = new Date();
  const wakeAt = new Date(startedAt.getTime() + minutes * 60_000);
  await prisma.napSession.upsert({
    where: { userId },
    create: { userId, startedAt, wakeAt },
    update: { startedAt, wakeAt },
  });
}

/** Idempotent — a no-op when there is no active session. */
export async function endNapSession(userId: string): Promise<void> {
  await prisma.napSession.deleteMany({ where: { userId } });
}

export async function activeNapSession(
  userId: string,
): Promise<ActiveNap | null> {
  const row = await prisma.napSession.findUnique({ where: { userId } });
  if (!row) return null;

  const live = describeActiveNap(row.wakeAt);
  if (!live) {
    // Dangling row — the user never finished. Clean it up.
    await prisma.napSession.deleteMany({ where: { userId } });
    return null;
  }

  return {
    wakeAt: jstNow(row.wakeAt).time,
    minutesRemaining: live.minutesRemaining,
  };
}
