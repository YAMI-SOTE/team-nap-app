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

export type TeamRestData = {
  teamAverageScore: number;
  memberCount: number;
  averageRestMinutes: number;
  selfInitiatedRate: number;
  encouragementCount: number;

  teamRestEvaluation: "good" | "normal" | "needs_improvement";

  encouragementEvaluation: "active" | "normal" | "low";
};
