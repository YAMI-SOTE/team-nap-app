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
  nextFree: {
    start: string;
    end: string;
    hoursUntilStart: number;
    minutesUntilStartRemainder: number;
    availableMemberCount: number;
  };
}

export interface HomeMemberStatusResponse {
  memberCount: number;
  memberStatusCounts: Record<HomeMemberStatus, number>;
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
  suggestion: {
    headline: [string, string];
    body: string;
    napMinutes: number;
  };
  achievement: string;
}

export interface NotificationSettingsResponse {
  napSuggestion: boolean;
  napEnd: boolean;
  teamNapSuggestion: boolean;
  wakeSupport: boolean;
}

export interface AccountSettingsResponse {
  username: string;
  email: string;
}

export interface SleepScheduleResponse {
  bedtime: string;
  wakeTime: string;
  napCutoffHour: number;
}

export interface CalendarIntegrationResponse {
  google: {
    connected: boolean;
    email: string | null;
    lastSyncedLabel: string | null;
  };
  device: {
    connected: boolean;
  };
}

export interface TeamSettingsResponse {
  teamName: string;
  memberCount: number;
  inviteCode: string;
  members: HomeMember[];
}

export interface MemberDetailResponse {
  id: string;
  name: string;
  label: string;
  status: HomeMemberStatus;
  /** "仮眠の状況" card — present while the member is resting. */
  nap: {
    /** Scheduled wake time, e.g. "14:47". */
    wakeAt: string;
    /** Minutes left until the scheduled wake time. */
    minutesRemaining: number;
  } | null;
  /** "起床サポート" card. */
  wakeSupport: {
    /**
     * Whether the member opted in to being woken by teammates.
     * When false, the "起きて〜" action is disabled.
     */
    wakeAssistEnabled: boolean;
  };
}

export interface ScheduleTask {
  id: string;
  /** Start time, e.g. "10:00". */
  start: string;
  /** End time, e.g. "11:00". */
  end: string;
  title: string;
}

export interface DayScheduleResponse {
  /** The team's next open slot, or null when there is none. */
  freeSlot: { start: string; end: string; note: string } | null;
  tasks: ScheduleTask[];
  /** Day-of-month numbers within the shown week that have events. */
  weekEventDays: number[];
}
