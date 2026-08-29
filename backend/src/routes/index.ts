import { Router } from "express";

import aiRoutes from "./ai.routes.js";
import healthRoutes from "./health.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/ai", aiRoutes);

export default router;
/*
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/rests", restRouter);
router.use("/schedules", scheduleRouter);
router.use("/teams", teamRouter);
*/
