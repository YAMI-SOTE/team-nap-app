import { Router } from "express";

import aiRoutes from "./ai.routes.js";
import healthRoutes from "./health.routes.js";
import homeRoutes from "./home.routes.js";
import restRoutes from "./rest.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/ai", aiRoutes);
router.use("/home", homeRoutes);
router.use("/rest", restRoutes);

export default router;