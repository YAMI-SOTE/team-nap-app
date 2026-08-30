import type { Request, Response } from "express";

import { getHealthStatus } from "../services/health.service.js";

export function getHealthController(_req: Request, res: Response) {
  res.status(200).json(getHealthStatus());
}
