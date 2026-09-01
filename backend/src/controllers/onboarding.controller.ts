import type { Request, Response } from "express";

import { requireUserId } from "../lib/request-user.js";
import {
  completeOnboarding,
  getOnboarding,
  updateOnboarding,
  type OnboardingPatch,
} from "../services/onboarding.service.js";

export async function getOnboardingController(req: Request, res: Response) {
  res.status(200).json(await getOnboarding(requireUserId(req)));
}

export async function updateOnboardingController(req: Request, res: Response) {
  res
    .status(200)
    .json(await updateOnboarding(requireUserId(req), req.body as OnboardingPatch));
}

export async function completeOnboardingController(
  req: Request,
  res: Response,
) {
  const data = req.body as {
    bedtime: string;
    wakeTime: string;
    calendarConnected?: boolean;
    notificationsEnabled?: boolean;
  };
  res.status(200).json(await completeOnboarding(requireUserId(req), data));
}
