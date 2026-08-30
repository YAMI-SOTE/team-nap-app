import type { Request, Response } from "express";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications.service.js";

export function getNotificationsController(_req: Request, res: Response) {
  res.status(200).json(listNotifications());
}

export function markNotificationReadController(req: Request, res: Response) {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  res.status(200).json(markNotificationRead(id));
}

export function markAllNotificationsReadController(_req: Request, res: Response) {
  res.status(200).json(markAllNotificationsRead());
}
