import { Router } from "express";

import { authenticate } from "../middleware/authenticate.middleware.js";
import aiRoutes from "./ai.routes.js";
import authRoutes from "./auth.routes.js";
import healthRoutes from "./health.routes.js";
import homeRoutes from "./home.routes.js";
import napRoutes from "./naps.routes.js";
import notificationRoutes from "./notifications.routes.js";
import onboardingRoutes from "./onboarding.routes.js";
import restRoutes from "./rest.routes.js";
import scheduleRoutes from "./schedule.routes.js";
import settingsRoutes from "./settings.routes.js";
import statsRoutes from "./stats.routes.js";
import teamRoutes from "./team.routes.js";

const router = Router();

// Public.
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);

// Everything below acts on behalf of the signed-in user.
router.use(authenticate);

router.use("/ai", aiRoutes);
router.use("/home", homeRoutes);
router.use("/rest", restRoutes);
router.use("/schedule", scheduleRoutes);
router.use("/settings", settingsRoutes);
router.use("/stats", statsRoutes);
router.use("/naps", napRoutes);
router.use("/notifications", notificationRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/teams", teamRoutes);

export default router;
