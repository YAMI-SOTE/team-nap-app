import type { ErrorRequestHandler } from "express";

import { HttpError } from "../lib/http-error.js";
import { step } from "../lib/api-flow.js";

/**
 * Terminal error handler. `HttpError`s become `{ error }` (plus optional
 * `details`) with their status; everything else is logged and returned
 * as a generic 500.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    step("error", `HttpError ${err.status}`, { message: err.message });
    res.status(err.status).json({
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  step("error", "unhandled", {
    message: err instanceof Error ? err.message : String(err),
  });
  console.error(err);
  res.status(500).json({ error: "サーバーエラーが発生しました" });
};
