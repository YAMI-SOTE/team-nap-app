import { Router } from "express";

import {
  getHomeMemberStatusController,
  getHomeSummaryController,
} from "../controllers/home.controller.js";

const router = Router();

router.get("/summary", getHomeSummaryController);
router.get("/member-status", getHomeMemberStatusController);

export default router;
