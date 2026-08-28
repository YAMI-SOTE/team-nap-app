import { config } from "@/constants/config";

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  if (!config.apiUrl) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  }

  const response = await fetch(`${config.apiUrl}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get<T>(endpoint: string) {
    return request<T>(endpoint);
  },

  post<T>(endpoint: string, body: unknown) {
    return request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

// ========================================
// REST終了後：個人コメント
// ========================================

export type PersonalRestData = {
  sleepHours: number;
  restMinutes: number;
  restTime: string;
  wakeScore: number;
  selfInitiated: boolean;
  restFrequency: number;
  encouragedOthers: boolean;

  restDurationEvaluation: "short" | "appropriate" | "long";
  restTimingEvaluation: "early" | "good" | "late";
  wakeEvaluation: "good" | "normal" | "sleepy";
  restFrequencyEvaluation: "low" | "appropriate" | "high";
  selfInitiatedEvaluation: "self" | "notification";
};

export async function generatePersonalRestComment(
  data: PersonalRestData,
): Promise<string> {
  const response = await fetch(`${API_URL}/api/ai/personal-comment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to generate personal AI comment");
  }

  const result = (await response.json()) as {
    comment: string;
  };

  return result.comment;
}

// ========================================
// TEAM画面：チームコメント
// ========================================

export type TeamRestData = {
  teamAverageScore: number;
  memberCount: number;
  averageRestMinutes: number;
  selfInitiatedRate: number;
  encouragementCount: number;

  teamRestEvaluation: "good" | "normal" | "needs_improvement";

  encouragementEvaluation: "active" | "normal" | "low";
};

export async function generateTeamRestComment(
  data: TeamRestData,
): Promise<string> {
  const response = await fetch(`${API_URL}/api/ai/team-comment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to generate team AI comment");
  }

  const result = (await response.json()) as {
    comment: string;
  };

  return result.comment;
}

// const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// export async function healthCheck() {
//   const response = await fetch(`${API_URL}/health`);

//   if (!response.ok) {
//     throw new Error("Backend health check failed");
//   }

//   return response.json();
// }
