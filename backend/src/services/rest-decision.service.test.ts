import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decideRestTiming } from "./rest-decision.service.js";

describe("decideRestTiming", () => {
  // ① 睡眠不足中心
  it("睡眠不足の場合は休息を推奨する", () => {
    const result = decideRestTiming({
      usualSleepStart: "23:30",
      usualWakeTime: "07:00",
      todaySleepHours: 5.5,
      continuousWorkMinutes: 30,
      lastRestTime: "12:30",
      currentTime: "14:30",
      freeTimes: [
        {
          start: "14:40",
          end: "15:20",
          durationMinutes: 40,
        },
      ],
    });

    assert.equal(result.shouldRest, true);
    assert.equal(result.needScore, 4);
    assert.equal(result.reasonCode, "REST_RECOMMENDED");
    assert.equal(result.recommendedStart, "14:40");
    assert.equal(result.recommendedEnd, "14:55");
  });

  // ② 長時間作業のみ
  it("長時間作業の場合は休息を推奨する", () => {
    const result = decideRestTiming({
      usualSleepStart: "23:30",
      usualWakeTime: "07:00",
      todaySleepHours: 7.5,
      continuousWorkMinutes: 120,
      lastRestTime: "13:30",
      currentTime: "14:30",
      freeTimes: [
        {
          start: "14:40",
          end: "15:20",
          durationMinutes: 40,
        },
      ],
    });

    assert.equal(result.shouldRest, true);
    assert.equal(result.needScore, 3);
    assert.equal(result.reasonCode, "REST_RECOMMENDED");
  });

  // ③ 休息した直後
  it("直近60分以内に休息していたら提案しない", () => {
    const result = decideRestTiming({
      usualSleepStart: "23:30",
      usualWakeTime: "07:00",
      todaySleepHours: 5,
      continuousWorkMinutes: 150,
      lastRestTime: "14:20",
      currentTime: "14:30",
      freeTimes: [
        {
          start: "14:40",
          end: "15:20",
          durationMinutes: 40,
        },
      ],
    });

    assert.equal(result.shouldRest, false);
    assert.equal(result.reasonCode, "RECENTLY_RESTED");
    assert.equal(result.recommendedStart, null);
  });

  // ④ 就寝直前
  it("就寝2時間前以内なら提案しない", () => {
    const result = decideRestTiming({
      usualSleepStart: "23:30",
      usualWakeTime: "07:00",
      todaySleepHours: 5,
      continuousWorkMinutes: 150,
      lastRestTime: "18:00",
      currentTime: "22:30",
      freeTimes: [
        {
          start: "22:40",
          end: "23:10",
          durationMinutes: 30,
        },
      ],
    });

    assert.equal(result.shouldRest, false);
    assert.equal(result.reasonCode, "TOO_LATE");
  });

  // ⑤ 空き時間なし
  it("15分以上の空き時間がなければ提案しない", () => {
    const result = decideRestTiming({
      usualSleepStart: "23:30",
      usualWakeTime: "07:00",
      todaySleepHours: 5,
      continuousWorkMinutes: 150,
      lastRestTime: "12:00",
      currentTime: "14:30",
      freeTimes: [
        {
          start: "14:40",
          end: "14:50",
          durationMinutes: 10,
        },
      ],
    });

    assert.equal(result.shouldRest, false);
    assert.equal(result.reasonCode, "NO_FREE_TIME");
  });

  // ⑥ 休息必要度が高い＋複数候補
  it("休息必要度が高い場合、最適な空き時間を選択する", () => {
    const result = decideRestTiming({
      usualSleepStart: "23:30",
      usualWakeTime: "07:00",
      todaySleepHours: 5,
      continuousWorkMinutes: 150,
      lastRestTime: null,
      currentTime: "14:00",
      freeTimes: [
        {
          start: "17:00",
          end: "18:00",
          durationMinutes: 60,
        },
        {
          start: "14:30",
          end: "15:00",
          durationMinutes: 30,
        },
        {
          start: "19:00",
          end: "20:00",
          durationMinutes: 60,
        },
      ],
    });

    assert.equal(result.shouldRest, true);
    assert.equal(result.needScore, 6);
    assert.equal(result.reasonCode, "HIGH_REST_NEED");

    // 3候補の中から14:30が選ばれることを確認
    assert.equal(result.recommendedStart, "14:30");
    assert.equal(result.recommendedEnd, "14:45");
    assert.equal(result.recommendedMinutes, 15);
  });
});