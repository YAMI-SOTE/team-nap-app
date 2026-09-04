/**
 * Background safety-net for Google Calendar: every
 * `GOOGLE_CALENDAR_SYNC_MINUTES` minutes, run an incremental sync for
 * each connected user and renew any push channel that's near expiry.
 * Real-time updates still come from the events.watch webhook when
 * configured; this catches anything missed (webhook down, channel
 * lapsed, webhooks disabled).
 *
 * Disabled when Google OAuth isn't configured, when the interval is 0,
 * or under tests.
 */

import { env } from "../config/env.js";
import { googleOAuthConfigured } from "../config/google.js";
import { prisma } from "../lib/prisma.js";
import { step } from "../lib/api-flow.js";
import {
  ensureCalendarWatch,
  syncCalendar,
} from "../services/google-calendar.service.js";

async function runOnce(): Promise<void> {
  const accounts = await prisma.googleAccount.findMany({
    select: { userId: true },
  });
  for (const { userId } of accounts) {
    await syncCalendar(userId).catch(() => undefined);
    await ensureCalendarWatch(userId).catch(() => undefined);
  }
  if (accounts.length > 0) {
    step("service", "google: periodic calendar sync", {
      accounts: accounts.length,
    });
  }
}

/** Start the interval. Returns a stop function (no-op when disabled). */
export function startGoogleCalendarSyncJob(): () => void {
  const minutes = env.GOOGLE_CALENDAR_SYNC_MINUTES;
  if (
    env.NODE_ENV === "test" ||
    minutes <= 0 ||
    !googleOAuthConfigured()
  ) {
    return () => undefined;
  }

  const timer = setInterval(() => {
    void runOnce();
  }, minutes * 60_000);
  timer.unref?.();
  return () => clearInterval(timer);
}
