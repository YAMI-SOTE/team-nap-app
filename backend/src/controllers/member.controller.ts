import type { Request, Response } from "express";

import { getMemberDetail } from "../services/member.service.js";

export function getMemberDetailController(req: Request, res: Response) {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const detail = getMemberDetail(id);

  if (!detail) {
    res.status(404).json({ message: "Member not found" });
    return;
  }

  res.status(200).json(detail);
}
