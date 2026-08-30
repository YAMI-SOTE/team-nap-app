import { Router } from "express";

import { getMemberDetailController } from "../controllers/member.controller.js";
import {
  createTeamController,
  getTeamSummaryController,
  joinTeamController,
} from "../controllers/team.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { memberIdParams } from "../schemas/member.schema.js";
import { createTeamBody, joinTeamBody } from "../schemas/team.schema.js";

const router = Router();

router.get("/summary", getTeamSummaryController);
router.post("/", validate({ body: createTeamBody }), createTeamController);
router.post("/join", validate({ body: joinTeamBody }), joinTeamController);
router.get(
  "/members/:id",
  validate({ params: memberIdParams }),
  getMemberDetailController,
);

export default router;
