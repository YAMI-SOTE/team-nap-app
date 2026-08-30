import { Router } from "express";

import { getMemberDetailController } from "../controllers/member.controller.js";
import { getTeamSummaryController } from "../controllers/team.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { memberIdParams } from "../schemas/member.schema.js";

const router = Router();

router.get("/summary", getTeamSummaryController);
router.get(
  "/members/:id",
  validate({ params: memberIdParams }),
  getMemberDetailController,
);

export default router;
