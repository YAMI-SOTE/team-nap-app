import type { Request, Response } from "express";

import { getHealthStatus } from "../services/health.service.js";

export function getHealth(_req: Request, res: Response) {
  const health = getHealthStatus();

  res.status(200).json(health);
}

export function notifyFrontendBootController(req: Request, res: Response) {
  const platform =
    typeof req.body?.platform === "string" ? req.body.platform : "unknown";
  const bootedAt =
    typeof req.body?.bootedAt === "string" ? req.body.bootedAt : new Date().toISOString();

  console.log(
    `[frontend-boot] Frontend booted successfully on ${platform} at ${bootedAt}`,
  );

  res.status(200).json({
    message: `Frontend boot confirmed on ${platform} at ${bootedAt}`,
  });
}
