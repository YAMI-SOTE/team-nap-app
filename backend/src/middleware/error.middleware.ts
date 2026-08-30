import type { ErrorRequestHandler } from "express";

import { HttpError } from "../lib/http-error.js";

/**
 * Terminal error handler. `HttpError`s become `{ error }` (plus optional
 * `details`) with their status; everything else is logged and returned
 * as a generic 500.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
};
