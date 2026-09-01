import { Router } from "express";

import {
  personalRestCommentController,
  teamRestCommentController,
} from "../controllers/ai.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  personalRestCommentBody,
  teamRestCommentBody,
} from "../schemas/ai.schema.js";

const router = Router();

router.post(
  "/personal-comment",
  validate({ body: personalRestCommentBody }),
  personalRestCommentController,
);

router.post(
  "/team-comment",
  validate({ body: teamRestCommentBody }),
  teamRestCommentController,
);

export default router;
