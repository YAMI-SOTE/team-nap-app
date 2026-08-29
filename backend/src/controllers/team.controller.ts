import type { Request, Response } from "express";

import { getTeamSummary } from "../services/team.service.js";

export function getTeamSummaryController(_req: Request, res: Response) {
  res.status(200).json(getTeamSummary());
}
