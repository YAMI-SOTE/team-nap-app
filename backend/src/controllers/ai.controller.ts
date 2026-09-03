import type { Request, Response } from "express";

import {
  generatePersonalRestComment,
  generateTeamRestComment,
  type PersonalRestData,
  type TeamRestData,
} from "../services/ai.service.js";

/**
 * REST 終了後の個人コメント。`ai.service` は Ollama が落ちていても
 * 定型文にフォールバックするので、ここでは 502 を投げず素直に返す。
 */
export async function personalRestCommentController(
  req: Request,
  res: Response,
) {
  const comment = await generatePersonalRestComment(
    req.body as PersonalRestData,
  );
  res.status(200).json({ comment });
}

/** TEAM 画面のコメント。個人コメントと同じくフォールバックあり。 */
export async function teamRestCommentController(req: Request, res: Response) {
  const comment = await generateTeamRestComment(req.body as TeamRestData);
  res.status(200).json({ comment });
}
