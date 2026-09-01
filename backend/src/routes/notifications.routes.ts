import { Router } from "express";

import {
  getNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "../controllers/notifications.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { notificationIdParams } from "../schemas/notifications.schema.js";

const router = Router();

router.get("/", getNotificationsController);
router.post("/read-all", markAllNotificationsReadController);
router.post(
  "/:id/read",
  validate({ params: notificationIdParams }),
  markNotificationReadController,
);

export default router;
