import type { Request, Response } from "express";

import { firstParam } from "../lib/params.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications.service.js";

export function getNotificationsController(_req: Request, res: Response) {
  res.status(200).json(listNotifications());
}

export function markNotificationReadController(req: Request, res: Response) {
  res.status(200).json(markNotificationRead(firstParam(req, "id")));
}

export function markAllNotificationsReadController(
  _req: Request,
  res: Response,
) {
  res.status(200).json(markAllNotificationsRead());
}
