import type { Request, Response } from "express";

/** Catch-all for unmatched routes. */
export function notFound(req: Request, res: Response) {
  res.status(404).json({
    error: "エンドポイントが見つかりません",
    path: req.originalUrl,
  });
}
