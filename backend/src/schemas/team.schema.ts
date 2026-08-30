import { z } from "zod";

const teamName = z.string().trim().min(1, "team name is required").max(50);

export const createTeamBody = z.object({ name: teamName });

export const updateTeamBody = z.object({ name: teamName });

export const joinTeamBody = z.object({
  inviteCode: z.string().trim().min(1, "invite code is required"),
});

export const statusBody = z.object({
  status: z.enum(["online", "resting"]),
});
