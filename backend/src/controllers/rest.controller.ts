import type { Request, Response } from "express";

import { requireUserId } from "../lib/request-user.js";
import { broadcastInvalidate } from "../realtime/hub.js";
import { teamIdOf } from "../services/team-presence.service.js";
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

/**
 * The nap card on a teammate's detail screen reads this session, so both
 * ends of a nap have to reach the team. Broadcast from here rather than
 * from `nap-session.service`: that module is a leaf the hub already
 * imports through `team-presence.service`, so importing the hub back into
 * it would close an import cycle.
 */
async function announceNapChange(userId: string): Promise<void> {
  const teamId = await teamIdOf(userId);
  if (teamId) broadcastInvalidate(teamId, "member");
}

/** Start / refresh the caller's live nap session (Rest timer opened). */
export async function startNapSessionController(req: Request, res: Response) {
  const userId = requireUserId(req);
  await startNapSession(userId, req.body.plannedMinutes);
  const session = await activeNapSession(userId);
  await announceNapChange(userId);
  res.status(200).json(session);
}

/** End the caller's live nap session (timer finished / cancelled / left). */
export async function endNapSessionController(req: Request, res: Response) {
  const userId = requireUserId(req);
  await endNapSession(userId);
  await announceNapChange(userId);
  res.status(204).send();
}
