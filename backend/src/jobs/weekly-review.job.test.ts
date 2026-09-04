import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isSendWindow,
  maySend,
  weeklyReviewBody,
} from "./weekly-review.job.js";

// 2026-09-07 is a Monday; 09-06 a Sunday, 09-08 a Tuesday.
const at = (iso: string) => new Date(iso);

describe("isSendWindow", () => {
  it("sends on Monday morning JST", () => {
    // 10:00 JST Monday
    assert.equal(isSendWindow(at("2026-09-07T01:00:00Z")), true);
  });

  it("is judged in JST, not the process timezone", () => {
    // 09:30 JST Monday — still Sunday in UTC, so a naive UTC weekday
    // check would wrongly skip it.
    assert.equal(isSendWindow(at("2026-09-07T00:30:00Z")), true);
    // 23:00 JST Sunday — Monday in UTC, but not yet Monday locally.
    assert.equal(isSendWindow(at("2026-09-06T14:00:00Z")), false);
  });

  it("waits until the send hour", () => {
    // 06:00 JST Monday
    assert.equal(isSendWindow(at("2026-09-06T21:00:00Z")), false);
  });

  it("does not send on other days", () => {
    assert.equal(isSendWindow(at("2026-09-08T01:00:00Z")), false); // Tue
    assert.equal(isSendWindow(at("2026-09-04T01:00:00Z")), false); // Fri
  });
});

describe("weeklyReviewBody", () => {
  it("encourages a week with no naps", () => {
    const out = weeklyReviewBody(0, 0);
    assert.match(out, /記録がありませんでした/);
    assert.ok(!out.includes("0回"));
  });

  it("reports the week's numbers", () => {
    const out = weeklyReviewBody(4, 72);
    assert.match(out, /4回/);
    assert.match(out, /72点/);
  });
});

describe("maySend", () => {
  const monday = at("2026-09-07T01:00:00Z");
  const ago = (ms: number) => new Date(monday.getTime() - ms);
  const DAY = 24 * 60 * 60_000;

  it("sends when the user has never had one", () => {
    assert.equal(maySend(null, monday), true);
  });

  it("suppresses a second send inside the same window", () => {
    assert.equal(maySend(ago(60_000), monday), false);
    assert.equal(maySend(ago(14 * 60 * 60_000), monday), false);
  });

  it("allows the next week's review", () => {
    assert.equal(maySend(ago(7 * DAY), monday), true);
  });

  it("deduplicates on the row's age, not a week boundary", () => {
    // A row written a few days *before* the notional week start still
    // counts. The previous boundary-based check let this through and
    // double-sent to every user.
    assert.equal(maySend(ago(3 * DAY), monday), false);
  });
});
