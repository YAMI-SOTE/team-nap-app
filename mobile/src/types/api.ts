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

export interface EventDraft {
  title: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
  allDay: boolean;
}

export type NotificationKind =
  | "team_nap_suggestion"
  | "wake_request"
  | "nap_ended"
  | "weekly_review"
  | "member_joined";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Relative time label, e.g. "2分前". */
  timestamp: string;
  read: boolean;
  /** Which section it belongs to. */
  group: "today" | "earlier";
}

export interface StatFocus {
  /** Concentration before naps this period. */
  before: number;
  /** Concentration after naps this period. */
  after: number;
  /** Delta in points. */
  deltaPt: number;
}

export interface WeeklyCondition {
  /** One value per weekday (mon–fri), any scale. */
  values: number[];
  labels: string[];
}

export interface RecentNap {
  id: string;
  /** "14:32〜14:47" */
  time: string;
  /** "8/21 ・ 15分 ・ 目覚め ★★★★☆" */
  detail: string;
}

export interface PersonalStatsResponse {
  score: number;
  scoreMax: number;
  scoreDeltaLabel: string;
  focus: StatFocus;
  napCount: number;
  avgNapMinutes: number;
  wakeRating: number;
  condition: WeeklyCondition;
  recentNaps: RecentNap[];
}

export interface TeamStatsResponse {
  achievementRate: number;
  achievedMemberLabel: string;
  achievementDeltaLabel: string;
  achievedMembers: HomeMember[];
  focus: StatFocus;
  napCount: number;
  avgNapMinutes: number;
  everyoneNappedDays: number;
  condition: WeeklyCondition;
  achievementBanner: string;
  disclaimer: string;
}
