import { Router } from "express";

import {
  createEventController,
  deleteEventController,
  getDayScheduleController,
  getEventController,
  updateEventController,
} from "../controllers/schedule.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  dayScheduleQuery,
  eventDraftBody,
  eventIdParams,
} from "../schemas/schedule.schema.js";

const router = Router();

router.get(
  "/day",
  validate({ query: dayScheduleQuery }),
  getDayScheduleController,
);
router.get(
  "/events/:id",
  validate({ params: eventIdParams }),
  getEventController,
);
router.post(
  "/events",
  validate({ body: eventDraftBody }),
  createEventController,
);
router.put(
  "/events/:id",
  validate({ params: eventIdParams, body: eventDraftBody }),
  updateEventController,
);
router.delete(
  "/events/:id",
  validate({ params: eventIdParams }),
  deleteEventController,
);

export default router;
