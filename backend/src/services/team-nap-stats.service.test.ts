import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { aggregateTeamWeek, type MemberInput, type NapRow } from "./team-nap-stats.service.js";
import { restScore } from "../lib/rest-score.js";

// A fixed Sun→Sat week with "today" = Wednesday (index 3).
const WEEK = [
  "2026-08-30", // Sun
  "2026-08-31", // Mon
  "2026-09-01", // Tue
  "2026-09-02", // Wed  ← today
  "2026-09-03", // Thu
  "2026-09-04", // Fri
  "2026-09-05", // Sat
];
const TODAY = "2026-09-02";

const members: MemberInput[] = [
  { userId: "u-taro", name: "太郎", avatar: "avatar-1", status: "working" },
  { userId: "u-hanako", name: "花子", avatar: null, status: "resting" },
  { userId: "u-jiro", name: null, avatar: null, status: "working" },
];

function nap(userId: string, date: string, over: Partial<NapRow> = {}): NapRow {
  return { userId, date, minutes: 15, wakeStars: 4, focusDeltaPt: 12, ...over };
}

describe("aggregateTeamWeek", () => {
  it("returns zeroed metrics when nobody has napped", () => {
    const w = aggregateTeamWeek({ members, naps: [], weekDays: WEEK, today: TODAY });

    assert.equal(w.memberCount, 3);
    assert.equal(w.napCount, 0);
    assert.equal(w.hasRecords, false);
    assert.equal(w.teamScore, 0);
    assert.equal(w.achievedCount, 0);
    assert.equal(w.achievementRate, 0);
    assert.equal(w.focusBefore, 0);
    assert.equal(w.everyoneNappedDays, 0);
    // Past + today are scored (0), future days are null.
    assert.deepEqual(w.dailyTeamScore, [0, 0, 0, 0, null, null, null]);
  });

  it("computes per-member week scores from real nap rows", () => {
    const naps: NapRow[] = [
      nap("u-taro", "2026-08-31"),
      nap("u-taro", "2026-09-01"),
      nap("u-taro", "2026-09-02"),
      nap("u-hanako", "2026-09-01"),
    ];
    const w = aggregateTeamWeek({ members, naps, weekDays: WEEK, today: TODAY });

    const taro = w.members.find((m) => m.userId === "u-taro")!;
    const hanako = w.members.find((m) => m.userId === "u-hanako")!;
    const jiro = w.members.find((m) => m.userId === "u-jiro")!;

    assert.equal(taro.napCount, 3);
    assert.equal(taro.score, restScore(naps.filter((n) => n.userId === "u-taro")));
    assert.equal(taro.achieved, true);
    assert.equal(hanako.napCount, 1);
    assert.equal(hanako.achieved, true);
    assert.equal(jiro.napCount, 0);
    assert.equal(jiro.achieved, false);
    assert.equal(jiro.score, 0);

    assert.equal(w.napCount, 4);
    assert.equal(w.achievedCount, 2);
    assert.equal(w.achievementRate, 67); // 2 / 3
    assert.equal(w.hasRecords, true);
    assert.equal(w.focusBefore, 50);
    assert.equal(
      w.teamScore,
      Math.round((taro.score + hanako.score + jiro.score) / 3),
    );
  });

  it("derives the member label from the name initial, or M when unnamed", () => {
    const w = aggregateTeamWeek({ members, naps: [], weekDays: WEEK, today: TODAY });
    assert.equal(w.members.find((m) => m.userId === "u-taro")!.label, "太");
    assert.equal(w.members.find((m) => m.userId === "u-jiro")!.label, "M");
  });

  it("counts a day only when every member napped, and never a future day", () => {
    const naps: NapRow[] = [
      // Monday: all three nap → everyoneNappedDay
      nap("u-taro", "2026-08-31"),
      nap("u-hanako", "2026-08-31"),
      nap("u-jiro", "2026-08-31"),
      // Tuesday: only two
      nap("u-taro", "2026-09-01"),
      nap("u-hanako", "2026-09-01"),
    ];
    const w = aggregateTeamWeek({ members, naps, weekDays: WEEK, today: TODAY });

    assert.equal(w.everyoneNappedDays, 1);
    assert.equal(w.dailyNapRate[1], 1); // Monday
    assert.equal(Math.round(w.dailyNapRate[2] * 100) / 100, 0.67); // Tuesday
    assert.equal(w.dailyNapRate[4], 0); // Thursday (future)
    assert.equal(w.dailyTeamScore[4], null);
  });

  it("handles an empty team without dividing by zero", () => {
    const w = aggregateTeamWeek({ members: [], naps: [], weekDays: WEEK, today: TODAY });
    assert.equal(w.memberCount, 0);
    assert.equal(w.teamScore, 0);
    assert.equal(w.achievementRate, 0);
    assert.equal(w.everyoneNappedDays, 0);
    assert.deepEqual(w.dailyTeamScore, [null, null, null, null, null, null, null]);
  });
});

describe("restScore", () => {
  it("is 0 for no naps and clamps to 100", () => {
    assert.equal(restScore([]), 0);
    const many = Array.from({ length: 8 }, () => ({ wakeStars: 5, focusDeltaPt: 30 }));
    assert.equal(restScore(many), 100);
  });

  it("rewards more naps, better wake ratings and bigger focus gains", () => {
    const one = restScore([{ wakeStars: 3, focusDeltaPt: 5 }]);
    const two = restScore([
      { wakeStars: 3, focusDeltaPt: 5 },
      { wakeStars: 3, focusDeltaPt: 5 },
    ]);
    assert.ok(two > one);
  });
});
