/**
 * Calendar events + day schedule. One in-memory list backs all of it:
 * `getDaySchedule` derives the day's tasks and the week's event dots from
 * the same events the CRUD endpoints mutate.
 */

import type { FreeTime } from "./rest-decision.service.js";
import { listNaps } from "./naps.service.js";

/**
 * The team's next open slot. `home.service` reads this too. `null` when
 * there is nothing to derive it from (no calendar connected / no events).
 */
type FreeSlot = {
  start: string;
  end: string;
  availableMemberCount: number;
  teamSize: number;
};

export function getNextFreeSlot(): FreeSlot | null {
  // Until real calendar integration there is no computed free slot.
  return null;
}

export type ScheduleEvent = {
  id: string;
  title: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
  allDay: boolean;
};

export type EventDraft = Omit<ScheduleEvent, "id">;

/**
 * The default schedule is **empty** — no calendar is connected and no
 * events have been added, so the app shows the "予定はありません" state.
 * Events only appear once the user adds them via the CRUD endpoints.
 */
let events: ScheduleEvent[] = [];
let nextId = 1000;

const MIN_FREE_TIME_MINUTES = 15;
const END_OF_DAY = 24 * 60;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const normalized = Math.min(Math.max(totalMinutes, 0), END_OF_DAY);

  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  if (hours === 24) {
    return "24:00";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}`;
}

/**
 * 指定日の予定を開始時刻順で返す。
 */
export function listEventsForDate(dateISO: string): ScheduleEvent[] {
  return events
    .filter((event) => event.date === dateISO)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * 指定日の現在時刻以降について、
 * 15分以上休める空き時間を計算する。
 */
export function getFreeTimesForDate(
  dateISO: string,
  currentTime: string,
): FreeTime[] {
  const dayEvents = listEventsForDate(dateISO);

  // 終日予定がある日は休息候補なし
  if (dayEvents.some((event) => event.allDay)) {
    return [];
  }

  const currentMinutes = timeToMinutes(currentTime);

  const timedEvents = dayEvents
    .filter((event) => !event.allDay)
    .map((event) => ({
      start: timeToMinutes(event.start),
      end: timeToMinutes(event.end),
    }))
    // すでに終了した予定は除外
    .filter((event) => event.end > currentMinutes)
    .sort((a, b) => a.start - b.start);

  const freeTimes: FreeTime[] = [];

  let cursor = currentMinutes;

  for (const event of timedEvents) {
    // 現在より前から始まっていて、
    // まだ続いている予定の場合
    if (event.start <= cursor) {
      cursor = Math.max(cursor, event.end);
      continue;
    }

    const durationMinutes = event.start - cursor;

    if (durationMinutes >= MIN_FREE_TIME_MINUTES) {
      freeTimes.push({
        start: minutesToTime(cursor),
        end: minutesToTime(event.start),
        durationMinutes,
      });
    }

    cursor = Math.max(cursor, event.end);
  }

  // 最後の予定以降〜24:00
  const finalDuration = END_OF_DAY - cursor;

  if (finalDuration >= MIN_FREE_TIME_MINUTES) {
    freeTimes.push({
      start: minutesToTime(cursor),
      end: "24:00",
      durationMinutes: finalDuration,
    });
  }

  return freeTimes;
}

function weekRange(dateISO: string): { start: string; end: string } {
  const [y, m, d] = dateISO.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() - base.getDay()); // Sunday
  const toISO = (dt: Date) =>
    `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, "0")}-${`${dt.getDate()}`.padStart(2, "0")}`;
  const endDt = new Date(base);
  endDt.setDate(endDt.getDate() + 6);
  return { start: toISO(base), end: toISO(endDt) };
}

function dayOfMonth(dateISO: string): number {
  return Number(dateISO.split("-")[2]);
}

export async function getDaySchedule(userId: string, dateISO: string) {
  const tasks = events
    .filter((e) => e.date === dateISO)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((e) => ({ id: e.id, start: e.start, end: e.end, title: e.title }));

  const { start, end } = weekRange(dateISO);
  const inWeek = (iso: string) => iso >= start && iso <= end;

  // day-of-month -> number of events on that day (the calendar strip
  // renders one dot per event, capped at 3).
  const weekEventCounts: Record<number, number> = {};
  for (const event of events) {
    if (!inWeek(event.date)) continue;
    const day = dayOfMonth(event.date);
    weekEventCounts[day] = (weekEventCounts[day] ?? 0) + 1;
  }

  // days this week that have a recorded nap (green ring on the strip).
  const naps = await listNaps(userId);
  const weekNapDays = [
    ...new Set(
      naps.filter((nap) => inWeek(nap.date)).map((nap) => dayOfMonth(nap.date)),
    ),
  ];

  const slot = getNextFreeSlot();

  return {
    freeSlot: slot
      ? {
          start: slot.start,
          end: slot.end,
          note: `次の空き時間 ・ ${slot.teamSize}人中${slot.availableMemberCount}人が予定なし`,
        }
      : null,
    tasks,
    weekEventCounts,
    weekNapDays,
  };
}

export function getEvent(id: string): EventDraft | undefined {
  const event = events.find((e) => e.id === id);
  if (!event) {
    return undefined;
  }
  const { id: _id, ...draft } = event;
  return draft;
}

export function createEvent(draft: EventDraft): ScheduleEvent {
  const event: ScheduleEvent = { id: `evt-${nextId++}`, ...draft };
  events.push(event);
  return event;
}

export function updateEvent(
  id: string,
  draft: EventDraft,
): ScheduleEvent | undefined {
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) {
    return undefined;
  }
  events[index] = { ...events[index], ...draft, id };
  return events[index];
}

export function deleteEvent(id: string): boolean {
  const before = events.length;
  events = events.filter((e) => e.id !== id);
  return events.length < before;
}