import { z } from "zod";

export const createTeamBody = z.object({
  name: z.string().trim().min(1, "team name is required").max(50),
});

export const joinTeamBody = z.object({
  inviteCode: z.string().trim().min(1, "invite code is required"),
});
