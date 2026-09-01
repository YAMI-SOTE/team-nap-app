import type { Request, Response } from "express";

import { decideRestTiming } from "../services/rest-decision.service.js";

export function getRestDecisionController(req: Request, res: Response) {
  res.status(200).json(decideRestTiming(req.body));
}
