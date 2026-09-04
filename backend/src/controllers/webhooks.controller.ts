import type { Request, Response } from "express";

import { handleGoogleCalendarWebhook } from "../services/google-calendar.service.js";

/**
 * Google Calendar `events.watch` push endpoint. Unauthenticated — Google
 * calls it directly and proves itself with the `X-Goog-Channel-Token`
 * header (checked in the service). Answer 200 immediately and do the
 * incremental sync in the background so Google doesn't retry.
 */
export function googleCalendarWebhookController(req: Request, res: Response) {
  void handleGoogleCalendarWebhook(req.headers).catch(() => undefined);
  res.status(200).end();
}
