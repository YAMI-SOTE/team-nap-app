import type { Request, Response } from "express";

import { currentUserId } from "../lib/request-user.js";
import {
  connectDeviceCalendar,
  disconnectGoogleCalendar,
  getAccountSettings,
  getCalendarIntegration,
  getNotificationSettings,
  getSleepSchedule,
  getTeamSettings,
  leaveTeam,
  syncGoogleCalendar,
  updateAccountSettings,
  updateNotificationSettings,
  updateSleepSchedule,
} from "../services/settings.service.js";

export function getAccountSettingsController(_req: Request, res: Response) {
  res.status(200).json(getAccountSettings());
}

export function updateAccountSettingsController(req: Request, res: Response) {
  res.status(200).json(updateAccountSettings(req.body));
}

export function getNotificationSettingsController(_req: Request, res: Response) {
  res.status(200).json(getNotificationSettings());
}

export function updateNotificationSettingsController(
  req: Request,
  res: Response,
) {
  res.status(200).json(updateNotificationSettings(req.body));
}

export function getSleepScheduleController(_req: Request, res: Response) {
  res.status(200).json(getSleepSchedule());
}

export function updateSleepScheduleController(req: Request, res: Response) {
  res.status(200).json(updateSleepSchedule(req.body));
}

export function getCalendarIntegrationController(_req: Request, res: Response) {
  res.status(200).json(getCalendarIntegration());
}

export function syncGoogleCalendarController(_req: Request, res: Response) {
  res.status(200).json(syncGoogleCalendar());
}

export function disconnectGoogleCalendarController(
  _req: Request,
  res: Response,
) {
  res.status(200).json(disconnectGoogleCalendar());
}

export function connectDeviceCalendarController(_req: Request, res: Response) {
  res.status(200).json(connectDeviceCalendar());
}

export async function getTeamSettingsController(req: Request, res: Response) {
  res.status(200).json(await getTeamSettings(currentUserId(req)));
}

export async function leaveTeamController(req: Request, res: Response) {
  res.status(200).json(await leaveTeam(currentUserId(req)));
}
