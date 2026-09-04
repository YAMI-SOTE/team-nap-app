import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  __resetHomeCommentCache,
  generateHomeComments,
  homeFallbackComments,
  parseHomeComments,
  personalFallbackComment,
  teamFallbackComment,
  type PersonalRestData,
  type TeamRestData,
} from "./ai.service.js";

const personal = (
  over: Partial<PersonalRestData> = {},
): PersonalRestData => ({
  sleepHours: 6,
  restMinutes: 15,
  restTime: "14:00",
  wakeScore: 4,
  selfInitiated: true,
  restFrequency: 1,
  encouragedOthers: false,
  restDurationEvaluation: "appropriate",
  restTimingEvaluation: "good",
  wakeEvaluation: "good",
  restFrequencyEvaluation: "appropriate",
  selfInitiatedEvaluation: "self",
  ...over,
});

const team = (over: Partial<TeamRestData> = {}): TeamRestData => ({
  teamAverageScore: 60,
  memberCount: 4,
  averageRestMinutes: 15,
  selfInitiatedRate: 0.5,
  encouragementCount: 3,
  teamRestEvaluation: "normal",
  encouragementEvaluation: "normal",
  ...over,
});

describe("personalFallbackComment", () => {
  it("composes a sentence from the evaluation codes", () => {
    const out = personalFallbackComment(
      personal({
        restDurationEvaluation: "short",
        wakeEvaluation: "sleepy",
        selfInitiatedEvaluation: "notification",
      }),
    );
    assert.match(out, /短め/);
    assert.match(out, /眠気/);
    assert.match(out, /通知/);
    // 1〜3 文の日本語、句点区切り。
    assert.ok(out.endsWith("。"));
    assert.ok(out.length <= 120);
  });

  it("covers every enum value without throwing / undefined", () => {
    const durations = ["short", "appropriate", "long"] as const;
    const wakes = ["good", "normal", "sleepy"] as const;
    const selfs = ["self", "notification"] as const;
    for (const d of durations)
      for (const w of wakes)
        for (const s of selfs) {
          const out = personalFallbackComment(
            personal({
              restDurationEvaluation: d,
              wakeEvaluation: w,
              selfInitiatedEvaluation: s,
            }),
          );
          assert.ok(out.length > 0);
          assert.ok(!out.includes("undefined"));
        }
  });
});

describe("teamFallbackComment", () => {
  it("composes a sentence from the team evaluation codes", () => {
    const out = teamFallbackComment(
      team({
        teamRestEvaluation: "needs_improvement",
        encouragementEvaluation: "low",
      }),
    );
    assert.match(out, /改善の余地/);
    assert.match(out, /少なめ/);
    assert.ok(out.endsWith("。"));
  });

  it("covers every enum value without throwing / undefined", () => {
    const rests = ["good", "normal", "needs_improvement"] as const;
    const encs = ["active", "normal", "low"] as const;
    for (const r of rests)
      for (const e of encs) {
        const out = teamFallbackComment(
          team({ teamRestEvaluation: r, encouragementEvaluation: e }),
        );
        assert.ok(out.length > 0);
        assert.ok(!out.includes("undefined"));
      }
  });
});

describe("homeFallbackComments", () => {
  it("covers every evaluation without undefined", () => {
    for (const e of ["good", "normal", "needs_improvement"] as const) {
      const out = homeFallbackComments(e);
      assert.equal(out.headline[0], "今日のチームは");
      assert.ok(out.headline[1].length > 0);
      assert.ok(out.headline[1].length <= 14);
      assert.ok(!JSON.stringify(out).includes("undefined"));
    }
  });
});

describe("parseHomeComments", () => {
  it("takes the JSON object out of a chatty response", () => {
    const out = parseHomeComments(
      'はい: {"headline":"いい感じです","aiAdvice":"良い状態です。"} 以上',
      "good",
    );
    assert.deepEqual(out.headline, ["今日のチームは", "いい感じです"]);
    assert.equal(out.aiAdvice, "良い状態です。");
  });

  it("keeps the canned headline when the model overruns 14 chars", () => {
    const out = parseHomeComments(
      JSON.stringify({
        headline: "とてもとてもとてもとても長い見出しです",
        aiAdvice: "良い状態です。",
      }),
      "good",
    );
    // Over-long headline is dropped, but the advice the model wrote stays.
    assert.equal(out.headline[1], "いい調子です");
    assert.equal(out.aiAdvice, "良い状態です。");
  });

  it("falls back on malformed / empty / non-JSON output", () => {
    const canned = homeFallbackComments("normal");
    for (const bad of [
      "no json here",
      "{ not valid json",
      JSON.stringify({ headline: "", aiAdvice: "x" }),
      JSON.stringify({ headline: "ok", aiAdvice: "   " }),
      JSON.stringify({ headline: 42, aiAdvice: "x" }),
    ]) {
      assert.deepEqual(parseHomeComments(bad, "normal"), canned);
    }
  });
});

describe("generateHomeComments", () => {
  it("returns immediately without waiting on the model", async () => {
    __resetHomeCommentCache();
    const startedAt = Date.now();
    const out = await generateHomeComments({
      teamScore: 80,
      teamEvaluation: "good",
    });
    // A cold cache serves the canned copy; the model runs behind the
    // response, so Home is never held open for it.
    assert.deepEqual(out, homeFallbackComments("good"));
    assert.ok(Date.now() - startedAt < 100);
  });
});
