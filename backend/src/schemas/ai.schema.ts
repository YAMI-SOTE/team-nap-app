import { z } from "zod";

/** Mirrors `PersonalRestData` in `ai.service.ts`. */
export const personalRestCommentBody = z.object({
  sleepHours: z.number(),
  restMinutes: z.number(),
  restTime: z.string(),
  wakeScore: z.number(),
  selfInitiated: z.boolean(),
  restFrequency: z.number(),
  encouragedOthers: z.boolean(),

  restDurationEvaluation: z.enum(["short", "appropriate", "long"]),
  restTimingEvaluation: z.enum(["early", "good", "late"]),
  wakeEvaluation: z.enum(["good", "normal", "sleepy"]),
  restFrequencyEvaluation: z.enum(["low", "appropriate", "high"]),
  selfInitiatedEvaluation: z.enum(["self", "notification"]),
});

/** Mirrors `TeamRestData` in `ai.service.ts`. */
export const teamRestCommentBody = z.object({
  teamAverageScore: z.number(),
  memberCount: z.number(),
  averageRestMinutes: z.number(),
  selfInitiatedRate: z.number(),
  encouragementCount: z.number(),

  teamRestEvaluation: z.enum(["good", "normal", "needs_improvement"]),
  encouragementEvaluation: z.enum(["active", "normal", "low"]),
});
