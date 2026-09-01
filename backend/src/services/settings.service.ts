import {
  getCurrentTeam,
  leaveTeam as clearCurrentTeam,
  type TeamSettingsResponse,
} from "./team.service.js";

export type { TeamSettingsResponse };

type NotificationSettings = {
  napSuggestion: boolean;
  napEnd: boolean;
  teamNapSuggestion: boolean;
  wakeSupport: boolean;
};

export type AccountSettingsResponse = {
  username: string;
  email: string;
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

let accountSettings: AccountSettingsResponse = {
  username: "Team Nap User",
  email: "user@example.com",
};

let notificationSettings: NotificationSettings = {
  napSuggestion: true,
  napEnd: true,
  teamNapSuggestion: true,
  wakeSupport: true,
};

let sleepSchedule: SleepScheduleResponse = {
  bedtime: "23:30",
  wakeTime: "07:30",
  napCutoffHour: 15,
};

let calendarIntegration: CalendarIntegrationResponse = {
  google: {
    connected: true,
    email: "user@example.com",
    lastSyncedLabel: "5分前",
  },
  device: {
    connected: false,
  },
};

export function getAccountSettings(): AccountSettingsResponse {
  return accountSettings;
}

export function updateAccountSettings(
  next: AccountSettingsResponse,
): AccountSettingsResponse {
  accountSettings = next;
  return accountSettings;
}

export function getNotificationSettings(): NotificationSettings {
  return notificationSettings;
}

export function updateNotificationSettings(
  next: Partial<NotificationSettings>,
): NotificationSettings {
  notificationSettings = {
    ...notificationSettings,
    ...next,
  };
  return notificationSettings;
}

export function getSleepSchedule(): SleepScheduleResponse {
  return sleepSchedule;
}

export function updateSleepSchedule(
  next: Pick<SleepScheduleResponse, "bedtime" | "wakeTime">,
): SleepScheduleResponse {
  sleepSchedule = {
    ...sleepSchedule,
    ...next,
  };
  return sleepSchedule;
}

export function getCalendarIntegration(): CalendarIntegrationResponse {
  return calendarIntegration;
}

export function syncGoogleCalendar(): CalendarIntegrationResponse {
  calendarIntegration = {
    ...calendarIntegration,
    google: {
      ...calendarIntegration.google,
      connected: true,
      email: calendarIntegration.google.email ?? "user@example.com",
      lastSyncedLabel: "たった今",
    },
  };
  return calendarIntegration;
}

export function disconnectGoogleCalendar(): CalendarIntegrationResponse {
  calendarIntegration = {
    ...calendarIntegration,
    google: {
      connected: false,
      email: null,
      lastSyncedLabel: null,
    },
  };
  return calendarIntegration;
}

export function connectDeviceCalendar(): CalendarIntegrationResponse {
  calendarIntegration = {
    ...calendarIntegration,
    device: {
      connected: true,
    },
  };
  return calendarIntegration;
}

export async function getTeamSettings(
  userId: string,
): Promise<TeamSettingsResponse | null> {
  return getCurrentTeam(userId);
}

export async function leaveTeam(userId: string): Promise<{ success: true }> {
  await clearCurrentTeam(userId);
  return { success: true };
}
