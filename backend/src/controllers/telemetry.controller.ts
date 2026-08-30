import type { Request, Response } from "express";

/**
 * Dev-only ping the app sends on boot so we can see the frontend reach
 * the API in the server log. Mounted at `POST /health/frontend-boot`;
 * the body is validated + defaulted by `frontendBootBody`.
 */
export function postFrontendBootController(req: Request, res: Response) {
  const { platform, bootedAt } = req.body as {
    platform: string;
    bootedAt: string;
  };

  console.log(
    `[frontend-boot] Frontend booted successfully on ${platform} at ${bootedAt}`,
  );

  res.status(200).json({
    message: `Frontend boot confirmed on ${platform} at ${bootedAt}`,
  });
}
