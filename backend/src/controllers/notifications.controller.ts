import type { Request, Response } from "express";

import { firstParam } from "../lib/params.js";
import { requireUserId } from "../lib/request-user.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications.service.js";

export function getNotificationsController(req: Request, res: Response) {
  res.status(200).json(listNotifications(requireUserId(req)));
}

export function markNotificationReadController(req: Request, res: Response) {
  res
    .status(200)
    .json(markNotificationRead(requireUserId(req), firstParam(req, "id")));
}

export function markAllNotificationsReadController(
  req: Request,
  res: Response,
) {
  res.status(200).json(markAllNotificationsRead(requireUserId(req)));
}
