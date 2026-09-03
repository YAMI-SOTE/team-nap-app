import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeActiveNap } from "./nap-session.service.js";

describe("describeActiveNap", () => {
  const now = new Date("2026-09-03T14:00:00Z");

  it("rounds remaining minutes up while the nap is running", () => {
    // 10 min 1 sec left → 11
    const r = describeActiveNap(new Date("2026-09-03T14:10:01Z"), now);
    assert.deepEqual(r, { minutesRemaining: 11, stale: false });
  });

  it("floors at 0 once wakeAt has passed but is still within grace", () => {
    const r = describeActiveNap(new Date("2026-09-03T13:50:00Z"), now); // 10 min ago
    assert.deepEqual(r, { minutesRemaining: 0, stale: false });
  });

  it("returns null once the session is more than 30 min stale", () => {
    assert.equal(
      describeActiveNap(new Date("2026-09-03T13:29:00Z"), now), // 31 min past wake
      null,
    );
  });

  it("keeps a session that woke exactly 30 min ago", () => {
    const r = describeActiveNap(new Date("2026-09-03T13:30:00Z"), now);
    assert.equal(r?.stale, false);
    assert.equal(r?.minutesRemaining, 0);
  });
});
