import { Router } from "express";

import { googleCalendarWebhookController } from "../controllers/webhooks.controller.js";

/**
 * Inbound webhooks from third parties. Mounted before `authenticate`
 * (see routes/index.ts) — each handler authenticates its own caller.
 */
const router = Router();

router.post("/google-calendar", googleCalendarWebhookController);

export default router;
