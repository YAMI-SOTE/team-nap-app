/**
 * Expo push delivery. Every `addNotification` (nudge, member-joined,
 * team-nap-suggestion, …) is also pushed to the recipient's registered
 * devices so it lands while the app is closed.
 *
 * Best-effort by design: `sendPushToUser` never throws and never blocks
 * the caller — the in-app feed row is the source of truth, the push is a
 * bonus. Tokens Expo reports as `DeviceNotRegistered` are pruned.
 *
 * Gated on `Onboarding.notificationsEnabled`: the user opts in from
 * Settings, and the app only has a token to register once OS permission
 * is granted.
 */

import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

export async function registerPushToken(
  userId: string,
  token: string,
  platform?: string,
): Promise<void> {
  // `token` is globally unique. If the same device token comes back under
  // a different account (device handed over, re-login), move it.
  await prisma.pushToken.upsert({
    where: { token },
    create: { userId, token, platform: platform ?? null },
    update: { userId, platform: platform ?? null },
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await prisma.pushToken.deleteMany({ where: { token } });
}

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type ExpoTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

/**
 * Fire a push to every device `userId` has registered. Swallows all
 * errors. Returns silently when the user has push disabled or no tokens.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    const onboarding = await prisma.onboarding.findUnique({
      where: { userId },
      select: { notificationsEnabled: true },
    });
    if (!onboarding?.notificationsEnabled) return;

    const tokens = await prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      sound: "default" as const,
      data: payload.data ?? {},
    }));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (env.EXPO_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${env.EXPO_ACCESS_TOKEN}`;
    }

    const res = await fetch(env.EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      console.error(`Expo push HTTP ${res.status}`);
      return;
    }

    const json = (await res.json()) as { data?: ExpoTicket[] };
    const tickets = json.data ?? [];

    // Prune tokens Expo says are dead so we stop paying for them.
    const dead: string[] = [];
    tickets.forEach((ticket, i) => {
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
      ) {
        const token = messages[i]?.to;
        if (token) dead.push(token);
      }
    });
    if (dead.length > 0) {
      await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    }
  } catch (err) {
    console.error("Expo push failed:", err);
  }
}
