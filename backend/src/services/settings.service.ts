import { prisma } from "../lib/prisma.js";
import {
  getCurrentTeam,
  leaveTeam as clearCurrentTeam,
  type TeamSettingsResponse,
} from "./team.service.js";
import { googleSampleEvents } from "./google-calendar-sample.js";
import { clearGoogleEvents, replaceGoogleEvents } from "./schedule.service.js";

export type { TeamSettingsResponse };

/**
 * Settings that belong to one user. Sleep schedule, notification toggles
 * and calendar-link state all live on that user's `Onboarding` row (the
 * same row onboarding fills in), so the Settings screens and onboarding
 * never disagree. Account name / email are on `User` and are edited via
 * `PATCH /auth/me`, not here.
 */

export type NotificationSettingsResponse = {
  napSuggestion: boolean;
  napEnd: boolean;
  teamNapSuggestion: boolean;
  wakeSupport: boolean;
};

export type SleepScheduleResponse = {
  bedtime: string;
  wakeTime: string;
  napCutoffHour: number;
};

export type CalendarIntegrationResponse = {
  google: {
    connected: boolean;
    email: string | null;
    lastSyncedLabel: string | null;
  };
  device: {
    connected: boolean;
  };
};

/** Read the user's settings row, creating it with defaults if missing. */
function settingsRow(userId: string) {
  return prisma.onboarding.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

// --- Notification toggles --------------------------------------------------

export async function getNotificationSettings(
  userId: string,
): Promise<NotificationSettingsResponse> {
  const row = await settingsRow(userId);
  return {
    napSuggestion: row.notifyNapSuggestion,
    napEnd: row.notifyNapEnd,
    teamNapSuggestion: row.notifyTeamNapSuggestion,
    wakeSupport: row.notifyWakeSupport,
  };
}

export async function updateNotificationSettings(
  userId: string,
  patch: Partial<NotificationSettingsResponse>,
): Promise<NotificationSettingsResponse> {
  await settingsRow(userId);
  const row = await prisma.onboarding.update({
    where: { userId },
    data: {
      ...(patch.napSuggestion !== undefined && {
        notifyNapSuggestion: patch.napSuggestion,
      }),
      ...(patch.napEnd !== undefined && { notifyNapEnd: patch.napEnd }),
      ...(patch.teamNapSuggestion !== undefined && {
        notifyTeamNapSuggestion: patch.teamNapSuggestion,
      }),
      ...(patch.wakeSupport !== undefined && {
        notifyWakeSupport: patch.wakeSupport,
      }),
    },
  });
  return {
    napSuggestion: row.notifyNapSuggestion,
    napEnd: row.notifyNapEnd,
    teamNapSuggestion: row.notifyTeamNapSuggestion,
    wakeSupport: row.notifyWakeSupport,
  };
}

// --- Sleep schedule -----------------------------------------------------------

export async function getSleepSchedule(
  userId: string,
): Promise<SleepScheduleResponse> {
  const row = await settingsRow(userId);
  return {
    bedtime: row.bedtime,
    wakeTime: row.wakeTime,
    napCutoffHour: row.napCutoffHour,
  };
}

export async function updateSleepSchedule(
  userId: string,
  next: Pick<SleepScheduleResponse, "bedtime" | "wakeTime">,
): Promise<SleepScheduleResponse> {
  await settingsRow(userId);
  const row = await prisma.onboarding.update({
    where: { userId },
    data: { bedtime: next.bedtime, wakeTime: next.wakeTime },
  });
  return {
    bedtime: row.bedtime,
    wakeTime: row.wakeTime,
    napCutoffHour: row.napCutoffHour,
  };
}

// --- Calendar links ---------------------------------------------------------
//
// There is no real Google OAuth in this project. "Connecting" Google
// Calendar imports a canned week of events (google-calendar-sample.ts)
// into the user's own CalendarEvent store; re-syncing refreshes them and
// disconnecting removes them. Device-calendar sync is still a stub flag.

/** "たった今" / "N分前" / "N時間前" / "M月D日" for the last-sync label. */
function relativeJa(from: Date | null): string | null {
  if (!from) return null;
  const diffMinutes = Math.floor((Date.now() - from.getTime()) / 60000);
  if (diffMinutes < 1) return "たった今";
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}時間前`;
  return `${from.getMonth() + 1}月${from.getDate()}日`;
}

function calendarView(row: {
  calendarConnected: boolean;
  calendarDeviceConnected: boolean;
  calendarLastSyncedAt: Date | null;
}): CalendarIntegrationResponse {
  return {
    google: {
      connected: row.calendarConnected,
      email: row.calendarConnected ? "sample@gmail.com" : null,
      lastSyncedLabel: row.calendarConnected
        ? relativeJa(row.calendarLastSyncedAt)
        : null,
    },
    device: { connected: row.calendarDeviceConnected },
  };
}

export async function getCalendarIntegration(
  userId: string,
): Promise<CalendarIntegrationResponse> {
  return calendarView(await settingsRow(userId));
}

export async function syncGoogleCalendar(
  userId: string,
): Promise<CalendarIntegrationResponse> {
  await settingsRow(userId);
  await replaceGoogleEvents(userId, googleSampleEvents());
  return calendarView(
    await prisma.onboarding.update({
      where: { userId },
      data: { calendarConnected: true, calendarLastSyncedAt: new Date() },
    }),
  );
}

export async function disconnectGoogleCalendar(
  userId: string,
): Promise<CalendarIntegrationResponse> {
  await settingsRow(userId);
  await clearGoogleEvents(userId);
  return calendarView(
    await prisma.onboarding.update({
      where: { userId },
      data: { calendarConnected: false, calendarLastSyncedAt: null },
    }),
  );
}

export async function connectDeviceCalendar(
  userId: string,
): Promise<CalendarIntegrationResponse> {
  await settingsRow(userId);
  return calendarView(
    await prisma.onboarding.update({
      where: { userId },
      data: { calendarDeviceConnected: true },
    }),
  );
}

// --- Team -------------------------------------------------------------------

export async function getTeamSettings(
  userId: string,
): Promise<TeamSettingsResponse | null> {
  return getCurrentTeam(userId);
}

export async function leaveTeam(userId: string): Promise<{ success: true }> {
  await clearCurrentTeam(userId);
  return { success: true };
}
