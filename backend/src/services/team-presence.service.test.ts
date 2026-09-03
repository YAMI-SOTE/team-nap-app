import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveStatus, OFFLINE_AFTER_MS } from "./team-presence.service.js";

describe("deriveStatus", () => {
  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms);

  it("resting always wins, regardless of lastSeenAt", () => {
    assert.equal(deriveStatus("resting", ago(OFFLINE_AFTER_MS * 10)), "resting");
    assert.equal(deriveStatus("resting", null), "resting");
  });

  it("online + seen recently → working", () => {
    assert.equal(deriveStatus("online", ago(60_000)), "working");
  });

  it("online + stale → offline", () => {
    assert.equal(deriveStatus("online", ago(OFFLINE_AFTER_MS + 1_000)), "offline");
  });

  it("online + never seen → offline", () => {
    assert.equal(deriveStatus("online", null), "offline");
  });

  it("just under the threshold still counts as seen", () => {
    assert.equal(deriveStatus("online", ago(OFFLINE_AFTER_MS - 5_000)), "working");
  });
});
