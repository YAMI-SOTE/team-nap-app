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

export type WeeklyBarState = "past" | "today" | "future";

export interface TeamWeeklyBar {
  label: string;
  /** Fill height as a 0–1 fraction of the track. */
  ratio: number;
  state: WeeklyBarState;
}

export interface TeamSummaryResponse {
  weekly: {
    /** Team Nap achievement rate for the week, as a percentage. */
    ratePercent: number;
    /** Change vs. the previous week, in percentage points. */
    deltaPercent: number;
    bars: TeamWeeklyBar[];
  };
  statusCounts: Record<HomeMemberStatus, number>;
  suggestion: {
    headline: [string, string];
    body: string;
    napMinutes: number;
  };
  achievement: string;
  memberCount: number;
  members: HomeMember[];
}
