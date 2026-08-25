import type { Request, Response } from "express";

import {
  generatePersonalRestComment,
  generateTeamRestComment,
  type PersonalRestData,
  type TeamRestData,
} from "../services/ai.service.js";


// REST終了後の個人コメント
export async function personalRestCommentController(
  req: Request,
  res: Response
) {
  try {
    const data = req.body as PersonalRestData;

    const comment = await generatePersonalRestComment(data);

    res.json({
      comment,
    });
  } catch (error) {
    console.error("Personal AI comment generation failed:", error);

    res.status(500).json({
      error: "Failed to generate personal AI comment",
    });
  }
}


// TEAM画面のコメント
export async function teamRestCommentController(
  req: Request,
  res: Response
) {
  try {
    const data = req.body as TeamRestData;

    const comment = await generateTeamRestComment(data);

    res.json({
      comment,
    });
  } catch (error) {
    console.error("Team AI comment generation failed:", error);

    res.status(500).json({
      error: "Failed to generate team AI comment",
    });
  }
}