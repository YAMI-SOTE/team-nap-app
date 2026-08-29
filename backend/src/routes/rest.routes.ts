import { Router } from "express";
import { getRestDecision } from "../controllers/rest.controller.js";

const router = Router();

router.post("/decision", getRestDecision);

export default router;