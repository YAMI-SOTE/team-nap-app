/**
 * Calendar events + day schedule. One in-memory list backs all of it:
 * `getDaySchedule` derives the day's tasks and the week's event dots from
 * the same events the CRUD endpoints mutate.
 */

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

const TIMEZONE = "Asia/Tokyo";

function isoOffsetFromToday(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
    const date = isoOffsetFromToday(offset);
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
  const weekEventDays = [
    ...new Set(
      events
        .filter((e) => e.date >= start && e.date <= end)
        .map((e) => dayOfMonth(e.date)),
    ),
  ];

  return {
    freeSlot: {
      start: "14:30",
      end: "15:00",
      note: "次の空き時間 ・ 6人中5人が予定なし",
    },
    tasks,
    weekEventDays,
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

export { TIMEZONE };
