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

type MemberStatus = "working" | "resting" | "offline";

export type TeamSettingsResponse = {
  teamName: string;
  memberCount: number;
  inviteCode: string;
  members: Array<{
    id: string;
    label: string;
    status: MemberStatus;
  }>;
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

let teamSettings: TeamSettingsResponse = {
  teamName: "TEAM NAP 開発チーム",
  memberCount: 6,
  inviteCode: "NAP-4821",
  members: [
    { id: "a", label: "A", status: "resting" },
    { id: "b", label: "B", status: "working" },
    { id: "c", label: "C", status: "working" },
    { id: "d", label: "D", status: "working" },
    { id: "e", label: "E", status: "resting" },
    { id: "f", label: "F", status: "offline" },
  ],
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

export function getTeamSettings(): TeamSettingsResponse {
  return teamSettings;
}

export function leaveTeam(): { success: true } {
  return { success: true };
}
