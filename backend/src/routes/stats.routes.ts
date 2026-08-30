import { Router } from "express";

import {
  getPersonalStatsController,
  getStatsController,
  getTeamStatsController,
} from "../controllers/stats.controller.js";

const router = Router();

router.get("/", getStatsController);
router.get("/personal", getPersonalStatsController);
router.get("/team", getTeamStatsController);

export default router;
