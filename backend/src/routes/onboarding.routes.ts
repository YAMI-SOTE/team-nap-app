import { Router } from "express";

import {
  completeOnboardingController,
  getOnboardingController,
  updateOnboardingController,
} from "../controllers/onboarding.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  completeOnboardingBody,
  updateOnboardingBody,
} from "../schemas/onboarding.schema.js";

const router = Router();

router.get("/", getOnboardingController);
router.put("/", validate({ body: updateOnboardingBody }), updateOnboardingController);
router.post(
  "/complete",
  validate({ body: completeOnboardingBody }),
  completeOnboardingController,
);

export default router;
