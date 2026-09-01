import { Router } from "express";

import { getHealthController } from "../controllers/health.controller.js";
import { postFrontendBootController } from "../controllers/telemetry.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { frontendBootBody } from "../schemas/telemetry.schema.js";

const router = Router();

router.get("/", getHealthController);
router.post(
  "/frontend-boot",
  validate({ body: frontendBootBody }),
  postFrontendBootController,
);

export default router;
