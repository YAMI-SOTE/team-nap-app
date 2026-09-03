import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeTime } from "./notifications.service.js";

describe("describeTime", () => {
  const now = new Date("2026-09-03T12:00:00");

  it("labels the last minute as たった今", () => {
    assert.equal(
      describeTime(new Date("2026-09-03T11:59:30"), now).timestamp,
      "たった今",
    );
  });

  it("labels minutes, hours and days back", () => {
    assert.equal(
      describeTime(new Date("2026-09-03T11:38:00"), now).timestamp,
      "22分前",
    );
    assert.equal(
      describeTime(new Date("2026-09-03T09:00:00"), now).timestamp,
      "3時間前",
    );
    assert.equal(
      describeTime(new Date("2026-09-01T12:00:00"), now).timestamp,
      "2日前",
    );
  });

  it("falls back to a date once older than a week", () => {
    assert.equal(
      describeTime(new Date("2026-08-20T12:00:00"), now).timestamp,
      "2026/8/20",
    );
  });

  it("groups by the server-local calendar day, not a 24h window", () => {
    assert.equal(describeTime(new Date("2026-09-03T00:05:00"), now).group, "today");
    assert.equal(
      describeTime(new Date("2026-09-02T23:55:00"), now).group,
      "earlier",
    );
  });

  it("never returns a negative label for a clock-skewed future time", () => {
    assert.equal(
      describeTime(new Date("2026-09-03T12:00:30"), now).timestamp,
      "たった今",
    );
  });
});
