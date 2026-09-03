import type { Request, Response } from "express";

import { requireUserId } from "../lib/request-user.js";
import { getRestRecommendation } from "../services/rest-recommendation.service.js";
import {
  activeNapSession,
  endNapSession,
  startNapSession,
} from "../services/nap-session.service.js";

export async function getRestDecisionController(
  req: Request,
  res: Response,
) {
  const userId = requireUserId(req);
  const result = await getRestRecommendation(userId);

  res.status(200).json(result);
}

/** Start / refresh the caller's live nap session (Rest timer opened). */
export async function startNapSessionController(req: Request, res: Response) {
  const userId = requireUserId(req);
  await startNapSession(userId, req.body.plannedMinutes);
  res.status(200).json(await activeNapSession(userId));
}

/** End the caller's live nap session (timer finished / cancelled / left). */
export async function endNapSessionController(req: Request, res: Response) {
  await endNapSession(requireUserId(req));
  res.status(204).send();
}
