import type { Request, Response } from "express";

import {
  getHomeMemberStatus,
  getHomeSummary,
} from "../services/home.service.js";

export async function getHomeSummaryController(
  _req: Request,
  res: Response,
) {
  const summary = await getHomeSummary();
  res.status(200).json(summary);
}

export function getHomeMemberStatusController(_req: Request, res: Response) {
  res.status(200).json(getHomeMemberStatus());
}
