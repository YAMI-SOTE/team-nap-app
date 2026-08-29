type MemberStatus = "working" | "resting" | "offline";

export type MemberDetailResponse = {
  id: string;
  name: string;
  label: string;
  status: MemberStatus;
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
};

const memberDetails: Record<string, MemberDetailResponse> = {
  a: {
    id: "a",
    name: "メンバーA",
    label: "A",
    status: "resting",
    nap: { wakeAt: "14:47", minutesRemaining: 10 },
    wakeSupport: { wakeAssistEnabled: true },
  },
  b: {
    id: "b",
    name: "メンバーB",
    label: "B",
    status: "working",
    nap: null,
    wakeSupport: { wakeAssistEnabled: true },
  },
  c: {
    id: "c",
    name: "メンバーC",
    label: "C",
    status: "resting",
    nap: { wakeAt: "15:05", minutesRemaining: 25 },
    wakeSupport: { wakeAssistEnabled: false },
  },
  d: {
    id: "d",
    name: "メンバーD",
    label: "D",
    status: "working",
    nap: null,
    wakeSupport: { wakeAssistEnabled: true },
  },
  e: {
    id: "e",
    name: "メンバーE",
    label: "E",
    status: "offline",
    nap: null,
    wakeSupport: { wakeAssistEnabled: false },
  },
  f: {
    id: "f",
    name: "メンバーF",
    label: "F",
    status: "working",
    nap: null,
    wakeSupport: { wakeAssistEnabled: true },
  },
};

export function getMemberDetail(id: string): MemberDetailResponse | undefined {
  return memberDetails[id];
}
