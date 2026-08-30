/**
 * Calendar events + day schedule. One in-memory list backs all of it:
 * `getDaySchedule` derives the day's tasks and the week's event dots from
 * the same events the CRUD endpoints mutate.
 */

import { isoDateOffset } from "../lib/datetime.js";
import { listNaps } from "./naps.service.js";

/**
 * The team's next open slot. Single source of truth — `home.service`
 * reads this too, so the Home "次の空き時間" and the Schedule free-slot
 * card always agree.
 */
const nextFreeSlot = {
  start: "14:30",
  end: "15:00",
  availableMemberCount: 5,
  teamSize: 6,
};

export function getNextFreeSlot() {
  return nextFreeSlot;
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

function seedEvents(): ScheduleEvent[] {
  const templates: Array<Omit<ScheduleEvent, "id" | "date">> = [
    { title: "定例ミーティング", start: "10:00", end: "11:00", allDay: false },
    { title: "1on1", start: "13:00", end: "14:00", allDay: false },
    { title: "資料確認", start: "16:00", end: "17:00", allDay: false },
    { title: "レビュー会", start: "11:00", end: "12:00", allDay: false },
    { title: "設計相談", start: "15:00", end: "15:30", allDay: false },
  ];

  const events: ScheduleEvent[] = [];
  let seq = 0;
  // Populate ~5 of the 7 days this week (deterministic).
  for (let offset = -3; offset <= 3; offset += 1) {
    if ((offset + 5) % 4 === 0) {
      continue;
    }
    const date = isoDateOffset(offset);
    const count = offset === 0 ? 3 : 1 + ((offset + 5) % 2);
    for (let i = 0; i < count; i += 1) {
      const template = templates[(seq + i) % templates.length];
      events.push({ id: `evt-${seq}-${i}`, date, ...template });
    }
    seq += 1;
  }
  return events;
}

let events: ScheduleEvent[] = seedEvents();
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

  const { start: freeStart, end: freeEnd, availableMemberCount, teamSize } =
    nextFreeSlot;

  return {
    freeSlot: {
      start: freeStart,
      end: freeEnd,
      note: `次の空き時間 ・ ${teamSize}人中${availableMemberCount}人が予定なし`,
    },
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
