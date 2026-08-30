import { Router } from "express";

import {
  createEventController,
  deleteEventController,
  getDayScheduleController,
  getEventController,
  updateEventController,
} from "../controllers/schedule.controller.js";

const router = Router();

router.get("/day", getDayScheduleController);
router.get("/events/:id", getEventController);
router.post("/events", createEventController);
router.put("/events/:id", updateEventController);
router.delete("/events/:id", deleteEventController);

export default router;
