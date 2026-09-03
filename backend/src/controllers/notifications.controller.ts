import type { Request, Response } from "express";

import { firstParam } from "../lib/params.js";
import { requireUserId } from "../lib/request-user.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications.service.js";

export async function getNotificationsController(req: Request, res: Response) {
  res.status(200).json(await listNotifications(requireUserId(req)));
}

export async function markNotificationReadController(
  req: Request,
  res: Response,
) {
  res
    .status(200)
    .json(await markNotificationRead(requireUserId(req), firstParam(req, "id")));
}

export async function markAllNotificationsReadController(
  req: Request,
  res: Response,
) {
  res.status(200).json(await markAllNotificationsRead(requireUserId(req)));
}
