import { Router } from "express";

import { getMemberDetailController } from "../controllers/member.controller.js";
import {
  createTeamController,
  getTeamRankingController,
  getTeamSummaryController,
  joinTeamController,
  renameTeamController,
} from "../controllers/team.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { memberIdParams } from "../schemas/member.schema.js";
import {
  createTeamBody,
  joinTeamBody,
  updateTeamBody,
} from "../schemas/team.schema.js";

const router = Router();

router.get("/summary", getTeamSummaryController);
router.get("/ranking", getTeamRankingController);
router.post("/", validate({ body: createTeamBody }), createTeamController);
router.put("/", validate({ body: updateTeamBody }), renameTeamController);
router.post("/join", validate({ body: joinTeamBody }), joinTeamController);
router.get(
  "/members/:id",
  validate({ params: memberIdParams }),
  getMemberDetailController,
);

export default router;
