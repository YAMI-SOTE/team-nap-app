import { Router } from "express";

import {
  createNapController,
  getNapController,
  getNapHistoryController,
} from "../controllers/naps.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { createNapBody, napIdParams } from "../schemas/naps.schema.js";

const router = Router();

router.get("/history", getNapHistoryController);
router.post("/", validate({ body: createNapBody }), createNapController);
router.get("/:id", validate({ params: napIdParams }), getNapController);

export default router;
