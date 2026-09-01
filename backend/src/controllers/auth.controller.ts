import type { Request, Response } from "express";

import { firstParam } from "../lib/params.js";
import { requireSessionId, requireUserId } from "../lib/request-user.js";
import {
  changePassword,
  getPublicUser,
  login,
  signUp,
} from "../services/auth.service.js";
import {
  confirmReset,
  requestReset,
} from "../services/password-reset.service.js";
import {
  listSessions,
  revokeAllSessions,
  revokeSession,
} from "../services/session.service.js";

function userAgentOf(req: Request): string | null {
  return req.header("user-agent") ?? null;
}

export async function signUpController(req: Request, res: Response) {
  const { name, email, password } = req.body as {
    name: string;
    email: string;
    password: string;
  };
  res.status(201).json(await signUp({ name, email, password }, userAgentOf(req)));
}

export async function loginController(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  res.status(200).json(await login({ email, password }, userAgentOf(req)));
}

export async function requestPasswordResetController(
  req: Request,
  res: Response,
) {
  const { email } = req.body as { email: string };
  const result = await requestReset(email);
  // 202: "if that email exists, a reset link is on its way".
  res.status(202).json({ ok: true, ...result });
}

export async function confirmPasswordResetController(
  req: Request,
  res: Response,
) {
  const { token, password } = req.body as { token: string; password: string };
  await confirmReset(token, password);
  res.status(204).end();
}

// --- session-scoped (mounted behind `authenticate`) -------------------------

export async function meController(req: Request, res: Response) {
  res.status(200).json({ user: await getPublicUser(requireUserId(req)) });
}

export async function logoutController(req: Request, res: Response) {
  await revokeSession(requireUserId(req), requireSessionId(req));
  res.status(204).end();
}

export async function changePasswordController(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };
  const result = await changePassword(
    requireUserId(req),
    currentPassword,
    newPassword,
    requireSessionId(req),
  );
  res.status(200).json(result);
}

export async function logoutOthersController(req: Request, res: Response) {
  const revoked = await revokeAllSessions(
    requireUserId(req),
    requireSessionId(req),
  );
  res.status(200).json({ revoked });
}

export async function listSessionsController(req: Request, res: Response) {
  res
    .status(200)
    .json(await listSessions(requireUserId(req), requireSessionId(req)));
}

export async function revokeSessionController(req: Request, res: Response) {
  await revokeSession(requireUserId(req), firstParam(req, "id"));
  res.status(204).end();
}
