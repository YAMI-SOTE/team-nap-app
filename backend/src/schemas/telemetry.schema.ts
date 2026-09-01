import { z } from "zod";

/** `POST /health/frontend-boot` — a dev telemetry ping from the app. */
export const frontendBootBody = z.object({
  platform: z.string().default("unknown"),
  bootedAt: z.string().default(() => new Date().toISOString()),
});
