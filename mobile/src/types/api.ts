// APIのレスポンスの型定義をまとめるファイル
export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

export type HomeMemberStatus = "working" | "resting" | "offline";

export interface HomeMember {
  id: string;
  label: string;
  status: HomeMemberStatus;
}

export interface HomeSummaryResponse {
  todayLabel: string;
  headline: [string, string];
  teamScore: number;
  aiAdvice: string;
  teamScoreMax: number;
  memberCount: number;
  memberStatusCounts: Record<HomeMemberStatus, number>;
  nextFree: {
    start: string;
    end: string;
    hoursUntilStart: number;
    minutesUntilStartRemainder: number;
    availableMemberCount: number;
  };
  members: HomeMember[];
}
