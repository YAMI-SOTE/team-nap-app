import type { Request, Response } from "express";

import { login, signUp } from "../services/auth.service.js";

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
