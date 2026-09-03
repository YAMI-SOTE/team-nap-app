import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { freeTimesFrom } from "./schedule.service.js";
import { googleSampleEvents } from "./google-calendar-sample.js";

describe("freeTimesFrom", () => {
  it("returns the gap between two events and the tail to midnight", () => {
    const free = freeTimesFrom(
      [
        { start: "10:00", end: "11:00", allDay: false },
        { start: "13:00", end: "14:00", allDay: false },
      ],
      "09:00",
    );
    assert.deepEqual(
      free.map((f) => `${f.start}-${f.end}`),
      ["09:00-10:00", "11:00-13:00", "14:00-24:00"],
    );
  });

  it("ignores events that already ended", () => {
    const free = freeTimesFrom(
      [{ start: "08:00", end: "09:00", allDay: false }],
      "12:00",
    );
    assert.deepEqual(free, [
      { start: "12:00", end: "24:00", durationMinutes: 720 },
    ]);
  });

  it("drops gaps shorter than 15 minutes", () => {
    const free = freeTimesFrom(
      [
        { start: "12:00", end: "12:10", allDay: false },
        { start: "12:20", end: "13:00", allDay: false },
      ],
      "12:00",
    );
    // 12:10-12:20 is only 10 min → not a free window.
    assert.deepEqual(
      free.map((f) => `${f.start}-${f.end}`),
      ["13:00-24:00"],
    );
  });

  it("treats a day with an all-day event as fully booked", () => {
    const free = freeTimesFrom(
      [{ start: "00:00", end: "23:59", allDay: true }],
      "09:00",
    );
    assert.deepEqual(free, []);
  });

  it("merges overlapping events", () => {
    const free = freeTimesFrom(
      [
        { start: "10:00", end: "12:00", allDay: false },
        { start: "11:00", end: "13:00", allDay: false },
      ],
      "09:00",
    );
    assert.deepEqual(
      free.map((f) => `${f.start}-${f.end}`),
      ["09:00-10:00", "13:00-24:00"],
    );
  });
});

describe("googleSampleEvents", () => {
  it("anchors the week to Monday and covers Mon–Fri plus next week", () => {
    // A Wednesday.
    const events = googleSampleEvents(new Date(2026, 8, 2));
    const dates = [...new Set(events.map((e) => e.date))].sort();
    assert.equal(dates[0], "2026-08-31"); // Monday of that week
    assert.ok(dates.includes("2026-09-04")); // Friday (all-day training)
    assert.ok(dates.some((d) => d >= "2026-09-07")); // next week
  });

  it("gives every event a stable, unique externalId", () => {
    const a = googleSampleEvents(new Date(2026, 8, 2));
    const b = googleSampleEvents(new Date(2026, 8, 2));
    assert.deepEqual(
      a.map((e) => e.externalId),
      b.map((e) => e.externalId),
    );
    assert.equal(new Set(a.map((e) => e.externalId)).size, a.length);
  });

  it("leaves a 15-min-plus afternoon gap every weekday", () => {
    const events = googleSampleEvents(new Date(2026, 8, 2));
    const byDate = new Map<string, typeof events>();
    for (const e of events) {
      byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
    }
    for (const [, dayEvents] of byDate) {
      if (dayEvents.some((e) => e.allDay)) continue;
      const free = freeTimesFrom(
        dayEvents.map((e) => ({ start: e.start, end: e.end, allDay: e.allDay })),
        "13:00",
      );
      assert.ok(
        free.some((f) => f.durationMinutes >= 15),
        `no 15-min gap after 13:00 on ${dayEvents[0]?.date}`,
      );
    }
  });
});
