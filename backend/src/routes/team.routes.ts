import { Router } from "express";

import { getMemberDetailController } from "../controllers/member.controller.js";
import { getTeamSummaryController } from "../controllers/team.controller.js";

const router = Router();

router.get("/summary", getTeamSummaryController);
router.get("/members/:id", getMemberDetailController);

export default router;
