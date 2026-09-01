import type { Request, Response } from "express";

import { HttpError } from "../lib/http-error.js";
import {
  generatePersonalRestComment,
  generateTeamRestComment,
  type PersonalRestData,
  type TeamRestData,
} from "../services/ai.service.js";

/** REST 終了後の個人コメント。 */
export async function personalRestCommentController(
  req: Request,
  res: Response,
) {
  try {
    const comment = await generatePersonalRestComment(
      req.body as PersonalRestData,
    );
    res.status(200).json({ comment });
  } catch (error) {
    console.error("Personal AI comment generation failed:", error);
    throw HttpError.badGateway("AIコメントの生成に失敗しました");
  }
}

/** TEAM 画面のコメント。 */
export async function teamRestCommentController(req: Request, res: Response) {
  try {
    const comment = await generateTeamRestComment(req.body as TeamRestData);
    res.status(200).json({ comment });
  } catch (error) {
    console.error("Team AI comment generation failed:", error);
    throw HttpError.badGateway("AIコメントの生成に失敗しました");
  }
}
