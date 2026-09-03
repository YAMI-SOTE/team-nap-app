import { z } from "zod";

export const notificationIdParams = z.object({
  id: z.string().min(1),
});

/** `POST` / `DELETE /notifications/token` — Expo push token for a device. */
export const pushTokenBody = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android", "web"]).optional(),
});
