import { api } from "@/services/api";

import type {
  CalendarIntegrationResponse,
  NotificationSettingsResponse,
  SleepScheduleResponse,
  TeamSettingsResponse,
} from "@/types/api";

export function getNotificationSettings(): Promise<NotificationSettingsResponse> {
  return api.get<NotificationSettingsResponse>("/settings/notifications");
}

export function updateNotificationSettings(
  body: Partial<NotificationSettingsResponse>,
): Promise<NotificationSettingsResponse> {
  return api.post<NotificationSettingsResponse>("/settings/notifications", body);
}

// Account name / email are read from `useAuth().user` (GET /auth/me) and
// saved via `updateProfile` (PATCH /auth/me), not through /settings.

export function getSleepSchedule(): Promise<SleepScheduleResponse> {
  return api.get<SleepScheduleResponse>("/settings/sleep-schedule");
}

export function updateSleepSchedule(
  body: Pick<SleepScheduleResponse, "bedtime" | "wakeTime">,
): Promise<SleepScheduleResponse> {
  return api.post<SleepScheduleResponse>("/settings/sleep-schedule", body);
}

export function getCalendarIntegration(): Promise<CalendarIntegrationResponse> {
  return api.get<CalendarIntegrationResponse>("/settings/calendar");
}

export function syncGoogleCalendar(): Promise<CalendarIntegrationResponse> {
  return api.post<CalendarIntegrationResponse>("/settings/calendar/google/sync", {});
}

/**
 * Silent incremental refresh (foreground trigger). No-op on the backend
 * unless a real Google account is connected — never imports the sample
 * set, never flips the "connected" flag.
 */
export function refreshGoogleCalendar(): Promise<{ synced: boolean }> {
  return api.post<{ synced: boolean }>(
    "/settings/calendar/google/refresh",
    {},
  );
}

export function disconnectGoogleCalendar(): Promise<CalendarIntegrationResponse> {
  return api.post<CalendarIntegrationResponse>(
    "/settings/calendar/google/disconnect",
    {},
  );
}

export function connectDeviceCalendar(): Promise<CalendarIntegrationResponse> {
  return api.post<CalendarIntegrationResponse>(
    "/settings/calendar/device/connect",
    {},
  );
}

/** `null` when the user has left / not joined a team. */
export function getTeamSettings(): Promise<TeamSettingsResponse | null> {
  return api.get<TeamSettingsResponse | null>("/settings/team");
}

export function leaveTeam(): Promise<{ success: true }> {
  return api.post<{ success: true }>("/settings/team/leave", {});
}
