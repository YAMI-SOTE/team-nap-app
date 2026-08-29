import { api } from "@/services/api";

import type { PersonalRestData, TeamRestData } from "@/types/ai";

type CommentResponse = {
  comment: string;
};

export async function generatePersonalRestComment(
  data: PersonalRestData,
): Promise<string> {
  const result = await api.post<CommentResponse>("/ai/personal-comment", data);

  return result.comment;
}

export async function generateTeamRestComment(
  data: TeamRestData,
): Promise<string> {
  const result = await api.post<CommentResponse>("/ai/team-comment", data);

  return result.comment;
}
