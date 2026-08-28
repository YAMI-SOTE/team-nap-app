import { Router } from "express";

import healthRouter from "./health.routes.js";

const router = Router();

router.use("/health", healthRouter);

export default router;

/*
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/rests", restRouter);
router.use("/schedules", scheduleRouter);
router.use("/teams", teamRouter);
*/
