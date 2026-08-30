import { Router } from "express";

import { getRestDecisionController } from "../controllers/rest.controller.js";

const router = Router();

router.post("/decision", getRestDecisionController);

export default router;
