import { z } from "zod";

const teamName = z.string().trim().min(1, "チーム名を入力してください").max(50);

export const createTeamBody = z.object({ name: teamName });

export const updateTeamBody = z.object({ name: teamName });

export const joinTeamBody = z.object({
  inviteCode: z.string().trim().min(1, "招待コードを入力してください"),
});

export const statusBody = z.object({
  status: z.enum(["online", "resting"]),
});

export const napSuggestionBody = z.object({
  /** Proposed nap length in minutes. */
  minutes: z.number().int().min(5).max(60).default(15),
});

export const teamFreeSlotsQuery = z.object({
  /** "YYYY-MM-DD". Omitted → today. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で指定してください")
    .optional(),
});
