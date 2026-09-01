import { Router } from "express";

import {
  connectDeviceCalendarController,
  disconnectGoogleCalendarController,
  getAccountSettingsController,
  getCalendarIntegrationController,
  getNotificationSettingsController,
  getSleepScheduleController,
  getTeamSettingsController,
  leaveTeamController,
  syncGoogleCalendarController,
  updateAccountSettingsController,
  updateNotificationSettingsController,
  updateSleepScheduleController,
} from "../controllers/settings.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  accountSettingsBody,
  notificationSettingsBody,
  sleepScheduleBody,
} from "../schemas/settings.schema.js";

const router = Router();

router.get("/account", getAccountSettingsController);
router.post(
  "/account",
  validate({ body: accountSettingsBody }),
  updateAccountSettingsController,
);

router.get("/notifications", getNotificationSettingsController);
router.post(
  "/notifications",
  validate({ body: notificationSettingsBody }),
  updateNotificationSettingsController,
);

router.get("/sleep-schedule", getSleepScheduleController);
router.post(
  "/sleep-schedule",
  validate({ body: sleepScheduleBody }),
  updateSleepScheduleController,
);

router.get("/calendar", getCalendarIntegrationController);
router.post("/calendar/google/sync", syncGoogleCalendarController);
router.post(
  "/calendar/google/disconnect",
  disconnectGoogleCalendarController,
);
router.post("/calendar/device/connect", connectDeviceCalendarController);

router.get("/team", getTeamSettingsController);
router.post("/team/leave", leaveTeamController);

export default router;
