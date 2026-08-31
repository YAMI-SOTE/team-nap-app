import type { Request } from "express";

import { env } from "../config/env.js";

/**
 * The acting user for a request. There is no auth yet: clients may send
 * an `X-User-Id` header; otherwise every request is the seeded dev user
 * (`env.DEV_USER_ID`), which preserves the old single-user behaviour.
 */
export function currentUserId(req: Request): string {
  const header = req.header("x-user-id")?.trim();
  return header && header.length > 0 ? header : env.DEV_USER_ID;
}
