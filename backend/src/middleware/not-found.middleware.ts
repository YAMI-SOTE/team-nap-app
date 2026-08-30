import type { Request, Response } from "express";

/** Catch-all for unmatched routes. */
export function notFound(req: Request, res: Response) {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
  });
}
