import type { Request, Response } from "express";

import {
  createTeam,
  getTeamSummary,
  joinTeam,
} from "../services/team.service.js";

export function getTeamSummaryController(_req: Request, res: Response) {
  res.status(200).json(getTeamSummary());
}

export function createTeamController(req: Request, res: Response) {
  const { name } = req.body as { name: string };
  res.status(201).json(createTeam(name));
}

export function joinTeamController(req: Request, res: Response) {
  const { inviteCode } = req.body as { inviteCode: string };
  res.status(200).json(joinTeam(inviteCode));
}
