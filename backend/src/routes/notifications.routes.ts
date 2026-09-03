import { Router } from "express";

import {
  getNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
  registerPushTokenController,
  unregisterPushTokenController,
} from "../controllers/notifications.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  notificationIdParams,
  pushTokenBody,
} from "../schemas/notifications.schema.js";

const router = Router();

router.get("/", getNotificationsController);
router.post("/read-all", markAllNotificationsReadController);

// Expo push token for the calling device.
router.post(
  "/token",
  validate({ body: pushTokenBody }),
  registerPushTokenController,
);
router.delete(
  "/token",
  validate({ body: pushTokenBody }),
  unregisterPushTokenController,
);

router.post(
  "/:id/read",
  validate({ params: notificationIdParams }),
  markNotificationReadController,
);

export default router;
