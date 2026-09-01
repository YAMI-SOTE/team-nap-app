/**
 * Calendar events + day schedule. One in-memory list backs all of it:
 * `getDaySchedule` derives the day's tasks and the week's event dots from
 * the same events the CRUD endpoints mutate.
 */

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

export function getDaySchedule(dateISO: string) {
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
  const weekNapDays = [
    ...new Set(
      listNaps()
        .filter((nap) => inWeek(nap.date))
        .map((nap) => dayOfMonth(nap.date)),
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
