import type { Request, Response } from "express";

import { requireUserId } from "../lib/request-user.js";
import { getRestRecommendation } from "../services/rest-recommendation.service.js";

export async function getRestDecisionController(
  req: Request,
  res: Response,
) {
  const userId = requireUserId(req);
  const result = await getRestRecommendation(userId);

  res.status(200).json(result);
}