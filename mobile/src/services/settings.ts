import { api } from "@/services/api";

import type {
  AccountSettingsResponse,
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

export function getAccountSettings(): Promise<AccountSettingsResponse> {
  return api.get<AccountSettingsResponse>("/settings/account");
}

export function updateAccountSettings(
  body: AccountSettingsResponse,
): Promise<AccountSettingsResponse> {
  return api.post<AccountSettingsResponse>("/settings/account", body);
}

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

export function getTeamSettings(): Promise<TeamSettingsResponse> {
  return api.get<TeamSettingsResponse>("/settings/team");
}

export function leaveTeam(): Promise<{ success: true }> {
  return api.post<{ success: true }>("/settings/team/leave", {});
}
