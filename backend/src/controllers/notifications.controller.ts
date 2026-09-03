import type { Request, Response } from "express";

import { firstParam } from "../lib/params.js";
import { requireUserId } from "../lib/request-user.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications.service.js";
import {
  registerPushToken,
  unregisterPushToken,
} from "../services/push.service.js";

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

/** Register / refresh this device's Expo push token. */
export async function registerPushTokenController(req: Request, res: Response) {
  await registerPushToken(
    requireUserId(req),
    req.body.token,
    req.body.platform,
  );
  res.status(204).send();
}

/** Drop this device's Expo push token (sign-out / permission revoked). */
export async function unregisterPushTokenController(
  req: Request,
  res: Response,
) {
  await unregisterPushToken(req.body.token);
  res.status(204).send();
}
