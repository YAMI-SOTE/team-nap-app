import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAdvice } from "./nap-advice.service.js";

describe("buildAdvice", () => {
  it("praises a well-timed 15-minute nap with a good wake rating", () => {
    const advice = buildAdvice({
      minutes: 15,
      wakeStars: 5,
      focusDeltaPt: 20,
      start: "14:32",
    });
    assert.match(advice, /適切な長さ/);
    assert.match(advice, /目覚めも良好/);
    assert.match(advice, /日中の眠気/);
    assert.match(advice, /集中度/);
  });

  it("flags a long late nap with a poor wake rating", () => {
    const advice = buildAdvice({
      minutes: 40,
      wakeStars: 1,
      focusDeltaPt: 0,
      start: "17:10",
    });
    assert.match(advice, /長めの仮眠/);
    assert.match(advice, /眠気が残った/);
    assert.match(advice, /夕方以降/);
  });

  it("always returns a non-empty string", () => {
    assert.ok(
      buildAdvice({ minutes: 10, wakeStars: 3, focusDeltaPt: 0, start: "09:00" })
        .length > 0,
    );
  });
});
