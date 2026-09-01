import type { Request, Response } from "express";

import { requireUserId } from "../lib/request-user.js";
import {
  connectDeviceCalendar,
  disconnectGoogleCalendar,
  getCalendarIntegration,
  getNotificationSettings,
  getSleepSchedule,
  getTeamSettings,
  leaveTeam,
  syncGoogleCalendar,
  updateNotificationSettings,
  updateSleepSchedule,
} from "../services/settings.service.js";

export async function getNotificationSettingsController(
  req: Request,
  res: Response,
) {
  res.status(200).json(await getNotificationSettings(requireUserId(req)));
}

export async function updateNotificationSettingsController(
  req: Request,
  res: Response,
) {
  res
    .status(200)
    .json(await updateNotificationSettings(requireUserId(req), req.body));
}

export async function getSleepScheduleController(req: Request, res: Response) {
  res.status(200).json(await getSleepSchedule(requireUserId(req)));
}

export async function updateSleepScheduleController(
  req: Request,
  res: Response,
) {
  res
    .status(200)
    .json(await updateSleepSchedule(requireUserId(req), req.body));
}

export async function getCalendarIntegrationController(
  req: Request,
  res: Response,
) {
  res.status(200).json(await getCalendarIntegration(requireUserId(req)));
}

export async function syncGoogleCalendarController(
  req: Request,
  res: Response,
) {
  res.status(200).json(await syncGoogleCalendar(requireUserId(req)));
}

export async function disconnectGoogleCalendarController(
  req: Request,
  res: Response,
) {
  res.status(200).json(await disconnectGoogleCalendar(requireUserId(req)));
}

export async function connectDeviceCalendarController(
  req: Request,
  res: Response,
) {
  res.status(200).json(await connectDeviceCalendar(requireUserId(req)));
}

export async function getTeamSettingsController(req: Request, res: Response) {
  res.status(200).json(await getTeamSettings(requireUserId(req)));
}

export async function leaveTeamController(req: Request, res: Response) {
  res.status(200).json(await leaveTeam(requireUserId(req)));
}
