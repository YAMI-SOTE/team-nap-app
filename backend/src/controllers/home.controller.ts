import type { Request, Response } from "express";

import {
  getHomeMemberStatus,
  getHomeSummary,
} from "../services/home.service.js";

export function getHomeSummaryController(_req: Request, res: Response) {
  res.status(200).json(getHomeSummary());
}

export function getHomeMemberStatusController(_req: Request, res: Response) {
  res.status(200).json(getHomeMemberStatus());
}
