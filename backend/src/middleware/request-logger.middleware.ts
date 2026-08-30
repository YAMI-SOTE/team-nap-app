import type { RequestHandler } from "express";

import { env } from "../config/env.js";

/** One line per request: `GET /api/v1/home/summary 200 4ms`. */
export const requestLogger: RequestHandler = (req, res, next) => {
  if (env.NODE_ENV === "test") {
    next();
    return;
  }

  const startedAt = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - startedAt;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`,
    );
  });
  next();
};
