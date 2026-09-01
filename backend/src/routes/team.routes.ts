import { Router } from "express";

import { getMemberDetailController } from "../controllers/member.controller.js";
import {
  createTeamController,
  getMyStatusController,
  getTeamRankingController,
  getTeamSummaryController,
  joinTeamController,
  renameTeamController,
  restNudgeController,
  setStatusController,
  suggestTeamNapController,
  wakeNudgeController,
} from "../controllers/team.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { memberIdParams } from "../schemas/member.schema.js";
import {
  createTeamBody,
  joinTeamBody,
  napSuggestionBody,
  statusBody,
  updateTeamBody,
} from "../schemas/team.schema.js";

const router = Router();

router.get("/summary", getTeamSummaryController);
router.get("/ranking", getTeamRankingController);

router.post("/", validate({ body: createTeamBody }), createTeamController);
router.put("/", validate({ body: updateTeamBody }), renameTeamController);
router.post("/join", validate({ body: joinTeamBody }), joinTeamController);

// Broadcast a team-nap suggestion to every other member.
router.post(
  "/nap-suggestion",
  validate({ body: napSuggestionBody }),
  suggestTeamNapController,
);

// The caller's own activity status.
router.get("/me/status", getMyStatusController);
router.put("/me/status", validate({ body: statusBody }), setStatusController);

router.get(
  "/members/:id",
  validate({ params: memberIdParams }),
  getMemberDetailController,
);
router.post(
  "/members/:id/wake",
  validate({ params: memberIdParams }),
  wakeNudgeController,
);
router.post(
  "/members/:id/rest",
  validate({ params: memberIdParams }),
  restNudgeController,
);

export default router;
