import { Router } from "express";

import { getNapHistoryController } from "../controllers/naps.controller.js";

const router = Router();

router.get("/history", getNapHistoryController);

export default router;
