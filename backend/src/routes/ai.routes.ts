import { Router } from "express";

import {
  personalRestCommentController,
  teamRestCommentController,
} from "../controllers/ai.controller.js";

const router = Router();

// REST終了後の個人コメント
router.post(
  "/personal-comment",
  personalRestCommentController
);

// TEAM画面のコメント
router.post(
  "/team-comment",
  teamRestCommentController
);

export default router;