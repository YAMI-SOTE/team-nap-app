import type { RequestHandler } from "express";

import { HttpError } from "../lib/http-error.js";
import { bearerToken } from "../lib/tokens.js";
import { step } from "../lib/api-flow.js";
import { lookupSession, touchSession } from "../services/session.service.js";
import { touchLastSeen } from "../services/team-presence.service.js";

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
    next(HttpError.unauthorized("ログインが必要です"));
    return;
  }

  const result = await lookupSession(token);
  if (!result.ok) {
    step("error", `auth: session ${result.reason}`);
    // A revoked session almost always means this account signed in on
    // another device (see `createSession` — one device at a time), so say
    // that instead of the generic "expired".
    next(
      HttpError.unauthorized(
        result.reason === "revoked"
          ? "別の端末でログインされたため、サインアウトされました"
          : "セッションが無効または期限切れです",
      ),
    );
    return;
  }

  const session = result.session;
  req.auth = { userId: session.userId, sessionId: session.sessionId };
  step("auth", "session ok", { userId: session.userId });

  // Best-effort recency bumps; never block or fail the request.
  void touchSession(session.sessionId).catch(() => {});
  void touchLastSeen(session.userId).catch(() => {});

  next();
};
