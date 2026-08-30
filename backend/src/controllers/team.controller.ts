import type { Request, Response } from "express";
import type { MemberActivity } from "@prisma/client";

import { firstParam } from "../lib/params.js";
import { currentUserId } from "../lib/request-user.js";
import {
  createTeam,
  getMyStatus,
  getTeamRanking,
  getTeamSummary,
  joinTeam,
  renameTeam,
  setActivity,
} from "../services/team.service.js";
import { sendNudge } from "../services/nudge.service.js";

export async function getTeamSummaryController(req: Request, res: Response) {
  res.status(200).json(await getTeamSummary(currentUserId(req)));
}

export async function getTeamRankingController(req: Request, res: Response) {
  res.status(200).json(await getTeamRanking(currentUserId(req)));
}

export async function createTeamController(req: Request, res: Response) {
  const { name } = req.body as { name: string };
  res.status(201).json(await createTeam(currentUserId(req), name));
}

export async function joinTeamController(req: Request, res: Response) {
  const { inviteCode } = req.body as { inviteCode: string };
  res.status(200).json(await joinTeam(currentUserId(req), inviteCode));
}

export async function renameTeamController(req: Request, res: Response) {
  const { name } = req.body as { name: string };
  res.status(200).json(await renameTeam(currentUserId(req), name));
}

export async function getMyStatusController(req: Request, res: Response) {
  res.status(200).json(await getMyStatus(currentUserId(req)));
}

export async function setStatusController(req: Request, res: Response) {
  const { status } = req.body as { status: MemberActivity };
  res.status(200).json(await setActivity(currentUserId(req), status));
}

export async function wakeNudgeController(req: Request, res: Response) {
  const result = await sendNudge(
    currentUserId(req),
    firstParam(req, "id"),
    "wake",
  );
  res.status(200).json(result);
}

export async function restNudgeController(req: Request, res: Response) {
  const result = await sendNudge(
    currentUserId(req),
    firstParam(req, "id"),
    "rest",
  );
  res.status(200).json(result);
}
