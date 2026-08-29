import { Router } from "express";

import aiRoutes from "./ai.routes.js";
import healthRoutes from "./health.routes.js";
import homeRoutes from "./home.routes.js";
import teamRoutes from "./team.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/ai", aiRoutes);
router.use("/home", homeRoutes);
router.use("/teams", teamRoutes);

export default router;
/*
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/rests", restRouter);
router.use("/schedules", scheduleRouter);
*/
