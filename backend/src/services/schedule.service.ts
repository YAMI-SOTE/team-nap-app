/**
 * Calendar events + day schedule — per user, persisted in Postgres
 * (`CalendarEvent`). The スケジュール screen CRUD, the day view, and the
 * free-time math that feeds the nap recommendation all read the same
 * rows. Google-sourced events (`source: "google"`) are imported by the
 * calendar sync in `settings.service`; everything the user adds by hand
 * is `source: "manual"`.
 */

import { prisma } from "../lib/prisma.js";
import { calendarWeek } from "../lib/datetime.js";
import type { FreeTime } from "./rest-decision.service.js";
import { listNaps } from "./naps.service.js";

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
  if (hours === 24) return "24:00";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Pure free-time math (kept independent of Prisma so it stays unit-testable)
// ---------------------------------------------------------------------------

type TimeSpan = { start: string; end: string; allDay: boolean };

/**
 * Open windows of at least 15 minutes on one day, from `currentTime`
 * ("HH:MM") to midnight, given that day's events. A day with any all-day
 * event has no free windows.
 */
export function freeTimesFrom(
  events: TimeSpan[],
  currentTime: string,
): FreeTime[] {
  if (events.some((event) => event.allDay)) return [];

  const currentMinutes = timeToMinutes(currentTime);

  const timedEvents = events
    .map((event) => ({
      start: timeToMinutes(event.start),
      end: timeToMinutes(event.end),
    }))
    .filter((event) => event.end > currentMinutes)
    .sort((a, b) => a.start - b.start);

  const freeTimes: FreeTime[] = [];
  let cursor = currentMinutes;

  for (const event of timedEvents) {
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

/** True when `[t, t+MIN]` sits entirely inside one of the free windows. */
function windowIsFree(freeTimes: FreeTime[], startMinutes: number): boolean {
  const endMinutes = startMinutes + MIN_FREE_TIME_MINUTES;
  return freeTimes.some(
    (f) =>
      timeToMinutes(f.start) <= startMinutes && timeToMinutes(f.end) >= endMinutes,
  );
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function toEvent(row: {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  allDay: boolean;
}): ScheduleEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    start: row.start,
    end: row.end,
    allDay: row.allDay,
  };
}

/** One user's events for a day, earliest first. */
export async function listEventsForDate(
  userId: string,
  dateISO: string,
): Promise<ScheduleEvent[]> {
  const rows = await prisma.calendarEvent.findMany({
    where: { userId, date: dateISO },
    orderBy: [{ start: "asc" }],
  });
  return rows.map(toEvent);
}

/** One user's open windows for a day from `currentTime` onward. */
export async function getFreeTimesForDate(
  userId: string,
  dateISO: string,
  currentTime: string,
): Promise<FreeTime[]> {
  const events = await listEventsForDate(userId, dateISO);
  return freeTimesFrom(events, currentTime);
}

export type NextFreeSlot = {
  start: string;
  end: string;
  /** Team members (caller included) with nothing scheduled in the slot. */
  availableMemberCount: number;
  /** Team size, or 1 for a solo account. */
  teamSize: number;
};

/**
 * The caller's next open window (≥ 15 min) on `dateISO` from `currentTime`.
 * Returns `null` when the caller has nothing scheduled that day — a wholly
 * empty day is "no plans", not a gap between commitments, so neither the
 * Home card nor the day view should surface a slot. When the caller is in
 * a team, `availableMemberCount` counts how many teammates are also free
 * for the first 15 minutes of that window.
 */
export async function getNextFreeSlot(
  userId: string,
  dateISO: string,
  currentTime: string,
): Promise<NextFreeSlot | null> {
  const myEvents = await listEventsForDate(userId, dateISO);
  if (myEvents.length === 0) return null;

  const mine = freeTimesFrom(myEvents, currentTime);
  if (mine.length === 0) return null;

  const slot = [...mine].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start),
  )[0];
  const slotStart = timeToMinutes(slot.start);

  const membership = await prisma.teamMembership.findUnique({
    where: { userId },
    select: { teamId: true },
  });

  if (!membership) {
    return {
      start: slot.start,
      end: slot.end,
      availableMemberCount: 1,
      teamSize: 1,
    };
  }

  const members = await prisma.teamMembership.findMany({
    where: { teamId: membership.teamId },
    select: { userId: true },
  });

  let availableMemberCount = 0;
  for (const m of members) {
    const free = await getFreeTimesForDate(m.userId, dateISO, currentTime);
    if (windowIsFree(free, slotStart)) availableMemberCount += 1;
  }

  return {
    start: slot.start,
    end: slot.end,
    availableMemberCount,
    teamSize: members.length,
  };
}

// ---------------------------------------------------------------------------
// Day schedule (スケジュール screen)
// ---------------------------------------------------------------------------

function dayOfMonth(dateISO: string): number {
  return Number(dateISO.split("-")[2]);
}

export async function getDaySchedule(userId: string, dateISO: string) {
  const [events, naps] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: [{ start: "asc" }],
    }),
    listNaps(userId),
  ]);

  const tasks = events
    .filter((e) => e.date === dateISO)
    .map((e) => ({ id: e.id, start: e.start, end: e.end, title: e.title }));

  const { start, end } = calendarWeek(new Date(`${dateISO}T00:00:00`));
  const inWeek = (iso: string) => iso >= start && iso <= end;

  // day-of-month -> number of events that day (calendar strip dots, capped at 3).
  const weekEventCounts: Record<number, number> = {};
  for (const event of events) {
    if (!inWeek(event.date)) continue;
    const day = dayOfMonth(event.date);
    weekEventCounts[day] = (weekEventCounts[day] ?? 0) + 1;
  }

  const weekNapDays = [
    ...new Set(
      naps.filter((nap) => inWeek(nap.date)).map((nap) => dayOfMonth(nap.date)),
    ),
  ];

  // The day view shows the first opening of the working day rather than a
  // real-time "next" slot (the Home screen handles "from now"). 08:00 keeps
  // the overnight block from swallowing the whole result.
  const slot = await getNextFreeSlot(userId, dateISO, "08:00");

  return {
    freeSlot: slot
      ? {
          start: slot.start,
          end: slot.end,
          note:
            slot.teamSize > 1
              ? `次の空き時間 ・ ${slot.teamSize}人中${slot.availableMemberCount}人が予定なし`
              : "次の空き時間",
        }
      : null,
    tasks,
    weekEventCounts,
    weekNapDays,
  };
}

// ---------------------------------------------------------------------------
// CRUD (all scoped to the calling user)
// ---------------------------------------------------------------------------

export async function getEvent(
  userId: string,
  id: string,
): Promise<EventDraft | undefined> {
  const row = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!row || row.userId !== userId) return undefined;
  const { id: _id, ...draft } = toEvent(row);
  return draft;
}

export async function createEvent(
  userId: string,
  draft: EventDraft,
): Promise<ScheduleEvent> {
  const row = await prisma.calendarEvent.create({
    data: { userId, source: "manual", ...draft },
  });
  return toEvent(row);
}

export async function updateEvent(
  userId: string,
  id: string,
  draft: EventDraft,
): Promise<ScheduleEvent | undefined> {
  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return undefined;
  const row = await prisma.calendarEvent.update({
    where: { id },
    data: { ...draft },
  });
  return toEvent(row);
}

export async function deleteEvent(
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;
  await prisma.calendarEvent.delete({ where: { id } });
  return true;
}

// ---------------------------------------------------------------------------
// Google Calendar import (called from settings.service on sync)
// ---------------------------------------------------------------------------

/**
 * Replace the user's `source: "google"` events with `events`, matching on
 * `externalId` so ids stay stable across a re-sync. Manual events are
 * never touched. Returns the number of Google events now stored.
 */
export async function replaceGoogleEvents(
  userId: string,
  events: Array<EventDraft & { externalId: string }>,
): Promise<number> {
  const keep = new Set(events.map((e) => e.externalId));

  await prisma.$transaction([
    prisma.calendarEvent.deleteMany({
      where: {
        userId,
        source: "google",
        externalId: { notIn: [...keep] },
      },
    }),
    ...events.map((e) =>
      prisma.calendarEvent.upsert({
        where: { userId_externalId: { userId, externalId: e.externalId } },
        update: {
          title: e.title,
          date: e.date,
          start: e.start,
          end: e.end,
          allDay: e.allDay,
        },
        create: {
          userId,
          source: "google",
          externalId: e.externalId,
          title: e.title,
          date: e.date,
          start: e.start,
          end: e.end,
          allDay: e.allDay,
        },
      }),
    ),
  ]);

  return prisma.calendarEvent.count({ where: { userId, source: "google" } });
}

/** Drop every Google-sourced event for the user (calendar disconnect). */
export async function clearGoogleEvents(userId: string): Promise<void> {
  await prisma.calendarEvent.deleteMany({
    where: { userId, source: "google" },
  });
}
