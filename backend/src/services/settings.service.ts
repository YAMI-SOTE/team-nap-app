import { prisma } from "../lib/prisma.js";
import {
  getCurrentTeam,
  leaveTeam as clearCurrentTeam,
  type TeamSettingsResponse,
} from "./team.service.js";

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

// --- Calendar links (mock: no real OAuth / device sync yet) ------------------

function calendarView(row: {
  calendarConnected: boolean;
  calendarDeviceConnected: boolean;
}): CalendarIntegrationResponse {
  return {
    google: {
      connected: row.calendarConnected,
      email: null,
      lastSyncedLabel: null,
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
  return calendarView(
    await prisma.onboarding.update({
      where: { userId },
      data: { calendarConnected: true },
    }),
  );
}

export async function disconnectGoogleCalendar(
  userId: string,
): Promise<CalendarIntegrationResponse> {
  await settingsRow(userId);
  return calendarView(
    await prisma.onboarding.update({
      where: { userId },
      data: { calendarConnected: false },
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
