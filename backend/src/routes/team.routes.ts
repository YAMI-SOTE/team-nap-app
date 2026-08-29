import { Router } from "express";

import { getTeamSummaryController } from "../controllers/team.controller.js";

const router = Router();

router.get("/summary", getTeamSummaryController);

export default router;
