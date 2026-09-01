import type { Request } from "express";

import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";

/**
 * The acting user for a request.
 *
 * - Behind `authenticate`: `req.auth.userId` (a real session user).
 * - Otherwise: the `X-User-Id` header, or `env.DEV_USER_ID` — the legacy
 *   single-user behaviour, kept for routes not yet moved onto sessions.
 */
export function currentUserId(req: Request): string {
  if (req.auth?.userId) return req.auth.userId;
  const header = req.header("x-user-id")?.trim();
  return header && header.length > 0 ? header : env.DEV_USER_ID;
}

/**
 * For routes mounted behind `authenticate`: the authenticated user id,
 * throwing 401 if the middleware did not run. Use this (not
 * `currentUserId`) in handlers that must never fall back to a header.
 */
export function requireUserId(req: Request): string {
  if (!req.auth?.userId) {
    throw HttpError.unauthorized("ログインが必要です");
  }
  return req.auth.userId;
}

/** The current session id; only present behind `authenticate`. */
export function requireSessionId(req: Request): string {
  if (!req.auth?.sessionId) {
    throw HttpError.unauthorized("ログインが必要です");
  }
  return req.auth.sessionId;
}
