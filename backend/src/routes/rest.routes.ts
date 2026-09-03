import { Router } from "express";

import {
  endNapSessionController,
  getRestDecisionController,
  startNapSessionController,
} from "../controllers/rest.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { napSessionBody } from "../schemas/rest.schema.js";

const router = Router();

router.post("/decision", getRestDecisionController);

// Live nap session — backs the teammate "あと◯分" card while the Rest
// timer is open on this user's device.
router.put(
  "/session",
  validate({ body: napSessionBody }),
  startNapSessionController,
);
router.delete("/session", endNapSessionController);

export default router;
