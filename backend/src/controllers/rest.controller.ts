import type { Request, Response } from "express";
import { decideRestTiming } from "../services/rest-decision.service.js";

export function getRestDecision(req: Request, res: Response) {
  try {
    const result = decideRestTiming(req.body);

    res.json(result);
  } catch (error) {
    console.error("Rest decision error:", error);

    res.status(500).json({
      error: "Failed to calculate rest decision",
    });
  }
}