import type { Request, Response } from "express";

import { requireUserId } from "../lib/request-user.js";
import {
  getPersonalStats,
  getStats,
  getTeamStats,
} from "../services/stats.service.js";

/** Combined endpoint — the client's stats screen needs both tabs. */
export async function getStatsController(req: Request, res: Response) {
  res.status(200).json(await getStats(requireUserId(req)));
}

export async function getPersonalStatsController(req: Request, res: Response) {
  res.status(200).json(await getPersonalStats(requireUserId(req)));
}

export async function getTeamStatsController(req: Request, res: Response) {
  res.status(200).json(await getTeamStats(requireUserId(req)));
}
