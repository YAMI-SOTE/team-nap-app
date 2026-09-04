import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapGoogleEvent } from "./google-calendar.service.js";

describe("mapGoogleEvent", () => {
  it("maps a timed event to the Asia/Tokyo wall clock", () => {
    const mapped = mapGoogleEvent({
      id: "evt_1",
      status: "confirmed",
      summary: "設計レビュー",
      start: { dateTime: "2026-09-04T13:30:00+09:00" },
      end: { dateTime: "2026-09-04T14:30:00+09:00" },
    });
    assert.deepEqual(mapped, {
      externalId: "evt_1",
      draft: {
        externalId: "evt_1",
        title: "設計レビュー",
        date: "2026-09-04",
        start: "13:30",
        end: "14:30",
        allDay: false,
      },
    });
  });

  it("converts a UTC dateTime into JST", () => {
    const mapped = mapGoogleEvent({
      id: "evt_utc",
      summary: "Sync",
      start: { dateTime: "2026-09-04T01:00:00Z" },
      end: { dateTime: "2026-09-04T02:00:00Z" },
    });
    assert.equal("draft" in mapped && mapped.draft.date, "2026-09-04");
    assert.equal("draft" in mapped && mapped.draft.start, "10:00");
    assert.equal("draft" in mapped && mapped.draft.end, "11:00");
  });

  it("marks an all-day event and spans the whole day", () => {
    const mapped = mapGoogleEvent({
      id: "evt_allday",
      summary: "社内研修",
      start: { date: "2026-09-07" },
      end: { date: "2026-09-08" },
    });
    assert.deepEqual(mapped, {
      externalId: "evt_allday",
      draft: {
        externalId: "evt_allday",
        title: "社内研修",
        date: "2026-09-07",
        start: "00:00",
        end: "23:59",
        allDay: true,
      },
    });
  });

  it("clamps an end that rolls past midnight to 23:59 on the start day", () => {
    const mapped = mapGoogleEvent({
      id: "evt_overnight",
      summary: "夜勤",
      start: { dateTime: "2026-09-04T22:00:00+09:00" },
      end: { dateTime: "2026-09-05T06:00:00+09:00" },
    });
    assert.equal("draft" in mapped && mapped.draft.start, "22:00");
    assert.equal("draft" in mapped && mapped.draft.end, "23:59");
    assert.equal("draft" in mapped && mapped.draft.date, "2026-09-04");
  });

  it("treats a cancelled event as a deletion", () => {
    assert.deepEqual(mapGoogleEvent({ id: "gone", status: "cancelled" }), {
      externalId: "gone",
      deleted: true,
    });
  });

  it("treats a malformed timed event (no start) as a deletion", () => {
    assert.deepEqual(mapGoogleEvent({ id: "weird", status: "confirmed" }), {
      externalId: "weird",
      deleted: true,
    });
  });

  it("falls back to a placeholder title when summary is missing", () => {
    const mapped = mapGoogleEvent({
      id: "notitle",
      start: { dateTime: "2026-09-04T09:00:00+09:00" },
      end: { dateTime: "2026-09-04T09:15:00+09:00" },
    });
    assert.equal("draft" in mapped && mapped.draft.title, "(無題)");
  });
});
