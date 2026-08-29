import { Router } from "express";

import { getHomeSummaryController } from "../controllers/home.controller.js";

const router = Router();

router.get("/summary", getHomeSummaryController);

export default router;
