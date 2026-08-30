import type { Request, Response } from "express";

import { currentUserId } from "../lib/request-user.js";
import {
  getPersonalStats,
  getStats,
  getTeamStats,
} from "../services/stats.service.js";

/** Combined endpoint — the client's stats screen needs both tabs. */
export async function getStatsController(req: Request, res: Response) {
  res.status(200).json(await getStats(currentUserId(req)));
}

export function getPersonalStatsController(_req: Request, res: Response) {
  res.status(200).json(getPersonalStats());
}

export async function getTeamStatsController(req: Request, res: Response) {
  res.status(200).json(await getTeamStats(currentUserId(req)));
}
