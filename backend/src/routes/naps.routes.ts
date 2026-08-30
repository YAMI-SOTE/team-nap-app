import { Router } from "express";

import {
  createNapController,
  getNapHistoryController,
} from "../controllers/naps.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { createNapBody } from "../schemas/naps.schema.js";

const router = Router();

router.get("/history", getNapHistoryController);
router.post("/", validate({ body: createNapBody }), createNapController);

export default router;
