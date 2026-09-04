import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  deriveMemberStatus,
  deriveStatus,
  OFFLINE_AFTER_MS,
  RESTING_EXPIRES_AFTER_MS,
  resetLivePresenceProbe,
  setLivePresenceProbe,
} from "./team-presence.service.js";

describe("deriveStatus", () => {
  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms);

  it("online + seen recently → working", () => {
    assert.equal(deriveStatus("online", ago(60_000)), "working");
  });

  it("online + stale → offline", () => {
    assert.equal(
      deriveStatus("online", ago(OFFLINE_AFTER_MS + 1_000)),
      "offline",
    );
  });

  it("online + never seen → offline", () => {
    assert.equal(deriveStatus("online", null), "offline");
  });

  it("just under the threshold still counts as seen", () => {
    assert.equal(
      deriveStatus("online", ago(OFFLINE_AFTER_MS - 5_000)),
      "working",
    );
  });

  it("resting outlives the plain idle window (a napping phone is locked)", () => {
    // Well past OFFLINE_AFTER_MS, but a declared nap still reads as 仮眠中.
    assert.equal(
      deriveStatus("resting", ago(OFFLINE_AFTER_MS * 4)),
      "resting",
    );
  });

  it("resting still expires — an abandoned nap does not last forever", () => {
    assert.equal(
      deriveStatus("resting", ago(RESTING_EXPIRES_AFTER_MS + 1_000)),
      "offline",
    );
    assert.equal(deriveStatus("resting", null), "offline");
  });

  it("an open socket beats staleness for both activities", () => {
    const ancient = ago(RESTING_EXPIRES_AFTER_MS * 10);
    assert.equal(deriveStatus("online", ancient, true), "working");
    assert.equal(deriveStatus("resting", ancient, true), "resting");
    assert.equal(deriveStatus("online", null, true), "working");
  });

  it("signing out (epoch lastSeenAt) reads as offline", () => {
    assert.equal(deriveStatus("online", new Date(0)), "offline");
    assert.equal(deriveStatus("resting", new Date(0)), "offline");
  });
});

describe("deriveMemberStatus", () => {
  afterEach(() => resetLivePresenceProbe());

  const stale = new Date(Date.now() - OFFLINE_AFTER_MS * 10);

  it("defaults to no live connection", () => {
    assert.equal(deriveMemberStatus("u1", "online", stale), "offline");
  });

  it("uses the injected probe to keep a connected member online", () => {
    setLivePresenceProbe((userId) => userId === "u1");
    assert.equal(deriveMemberStatus("u1", "online", stale), "working");
    assert.equal(deriveMemberStatus("u2", "online", stale), "offline");
  });
});
