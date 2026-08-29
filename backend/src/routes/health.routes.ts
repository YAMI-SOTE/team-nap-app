import { Router } from "express";

import {
  getHealth,
  notifyFrontendBootController,
} from "../controllers/health.controller.js";

const router = Router();

router.get("/", getHealth);
router.post("/frontend-boot", notifyFrontendBootController);

export default router;
