import { Router } from "express";

import {
  getNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "../controllers/notifications.controller.js";

const router = Router();

router.get("/", getNotificationsController);
router.post("/read-all", markAllNotificationsReadController);
router.post("/:id/read", markNotificationReadController);

export default router;
