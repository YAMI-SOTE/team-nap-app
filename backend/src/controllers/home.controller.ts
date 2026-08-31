import type { Request, Response } from "express";

import { currentUserId } from "../lib/request-user.js";
import {
  getHomeMemberStatus,
  getHomeSummary,
} from "../services/home.service.js";

export function getHomeSummaryController(_req: Request, res: Response) {
  res.status(200).json(getHomeSummary());
}

export async function getHomeMemberStatusController(
  req: Request,
  res: Response,
) {
  res.status(200).json(await getHomeMemberStatus(currentUserId(req)));
}
