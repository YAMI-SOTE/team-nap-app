import type { Request, Response } from "express";

import { getHealthStatus } from "../services/health.service.js";

export function getHealth(_req: Request, res: Response) {
  const health = getHealthStatus();

  res.status(200).json(health);
}
