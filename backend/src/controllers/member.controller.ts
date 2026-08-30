import type { Request, Response } from "express";

import { firstParam } from "../lib/params.js";
import { HttpError } from "../lib/http-error.js";
import { getMemberDetail } from "../services/member.service.js";

export function getMemberDetailController(req: Request, res: Response) {
  const detail = getMemberDetail(firstParam(req, "id"));

  if (!detail) {
    throw HttpError.notFound("Member not found");
  }

  res.status(200).json(detail);
}
