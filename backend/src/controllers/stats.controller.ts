import type { Request, Response } from "express";

import {
  getPersonalStats,
  getStats,
  getTeamStats,
} from "../services/stats.service.js";

/** Combined endpoint — the client's stats screen needs both tabs. */
export function getStatsController(_req: Request, res: Response) {
  res.status(200).json(getStats());
}

export function getPersonalStatsController(_req: Request, res: Response) {
  res.status(200).json(getPersonalStats());
}

export function getTeamStatsController(_req: Request, res: Response) {
  res.status(200).json(getTeamStats());
}
