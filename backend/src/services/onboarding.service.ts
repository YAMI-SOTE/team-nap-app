import { prisma } from "../lib/prisma.js";

/**
 * Onboarding profile — the answers collected right after sign-up
 * (sleep rhythm, calendar/notification opt-ins). A row is created with
 * defaults at sign-up and lazily for anyone who predates that, so the
 * client can always ask "has this user finished onboarding?" and route
 * them through it when not.
 */

export type OnboardingResponse = {
  completed: boolean;
  bedtime: string;
  wakeTime: string;
  calendarConnected: boolean;
  notificationsEnabled: boolean;
  completedAt: string | null;
};

type Row = {
  bedtime: string;
  wakeTime: string;
  calendarConnected: boolean;
  notificationsEnabled: boolean;
  completedAt: Date | null;
};

function toResponse(row: Row): OnboardingResponse {
  return {
    completed: row.completedAt !== null,
    bedtime: row.bedtime,
    wakeTime: row.wakeTime,
    calendarConnected: row.calendarConnected,
    notificationsEnabled: row.notificationsEnabled,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

/** Create the default row if the user has none. Safe to call repeatedly. */
export async function ensureOnboarding(userId: string): Promise<void> {
  await prisma.onboarding.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function getOnboarding(
  userId: string,
): Promise<OnboardingResponse> {
  const row = await prisma.onboarding.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return toResponse(row);
}

export type OnboardingPatch = Partial<{
  bedtime: string;
  wakeTime: string;
  calendarConnected: boolean;
  notificationsEnabled: boolean;
}>;

/** Save answers as the user moves through onboarding. Does not complete it. */
export async function updateOnboarding(
  userId: string,
  patch: OnboardingPatch,
): Promise<OnboardingResponse> {
  const row = await prisma.onboarding.upsert({
    where: { userId },
    update: patch,
    create: { userId, ...patch },
  });
  return toResponse(row);
}

/**
 * Finish onboarding. Persists the final answers and stamps `completedAt`
 * the first time; calling it again just updates the answers (idempotent,
 * keeps the original completion time).
 */
export async function completeOnboarding(
  userId: string,
  data: {
    bedtime: string;
    wakeTime: string;
    calendarConnected?: boolean;
    notificationsEnabled?: boolean;
    /** Chosen avatar id — lives on `User`, not the onboarding row. */
    avatar?: string | null;
  },
): Promise<OnboardingResponse> {
  const { avatar, ...onboarding } = data;
  if (avatar !== undefined) {
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatar || null },
    });
  }
  const existing = await prisma.onboarding.findUnique({ where: { userId } });
  const row = await prisma.onboarding.upsert({
    where: { userId },
    update: {
      ...onboarding,
      completedAt: existing?.completedAt ?? new Date(),
    },
    create: { userId, ...onboarding, completedAt: new Date() },
  });
  return toResponse(row);
}
