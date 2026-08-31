import type { RequestHandler } from "express";

import { HttpError } from "../lib/http-error.js";
import { bearerToken } from "../lib/tokens.js";
import { step } from "../lib/api-flow.js";
import { resolveSession, touchSession } from "../services/session.service.js";

/**
 * Require a valid session. Reads `Authorization: Bearer <token>`,
 * resolves it to a live session, and sets
 * `req.auth = { userId, sessionId }`. Rejects missing/expired/revoked
 * tokens with 401. Mount it on a router (`router.use(authenticate)`) or a
 * single route.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req.header("authorization"));
  if (!token) {
    next(HttpError.unauthorized("Authentication required"));
    return;
  }

  const session = await resolveSession(token);
  if (!session) {
    step("error", "auth: invalid session");
    next(HttpError.unauthorized("Invalid or expired session"));
    return;
  }

  req.auth = { userId: session.userId, sessionId: session.sessionId };
  step("auth", "session ok", { userId: session.userId });

  // Best-effort recency bump; never blocks or fails the request.
  void touchSession(session.sessionId).catch(() => {});

  next();
};
