import { Router } from "express";

import {
  completeOnboardingController,
  getOnboardingController,
  updateOnboardingController,
} from "../controllers/onboarding.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  completeOnboardingBody,
  updateOnboardingBody,
} from "../schemas/onboarding.schema.js";

const router = Router();

// The onboarding profile belongs to the authenticated user.
router.use(authenticate);

router.get("/", getOnboardingController);
router.put("/", validate({ body: updateOnboardingBody }), updateOnboardingController);
router.post(
  "/complete",
  validate({ body: completeOnboardingBody }),
  completeOnboardingController,
);

export default router;
