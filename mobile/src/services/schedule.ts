import { addDays, startOfWeek, toISODate } from "@/utils/date";

import type { DayScheduleResponse, EventDraft } from "@/types/api";

/**
 * Day schedule.
 *
 * There is no schedule endpoint on the backend yet, so this returns a
 * local sample. Swap the body for `api.get("/schedules?date=…")` once the
 * endpoint exists — `DayScheduleResponse` is the intended contract.
 */

const SAMPLE_DAY: Omit<DayScheduleResponse, "weekEventDays"> = {
  freeSlot: {
    start: "14:30",
    end: "15:00",
    note: "次の空き時間 ・ 6人中5人が予定なし",
  },
  tasks: [
    { id: "t1", start: "10:00", end: "11:00", title: "定例ミーティング" },
    { id: "t2", start: "13:00", end: "14:00", title: "1on1" },
    { id: "t3", start: "16:00", end: "17:00", title: "資料確認" },
  ],
};

/** Deterministic stand-in for "this day has calendar events". */
function dayHasEvents(date: Date): boolean {
  return (date.getDate() + date.getMonth() * 3) % 4 !== 0;
}

export async function getDaySchedule(
  date: Date,
): Promise<DayScheduleResponse> {
  const weekStart = startOfWeek(date);
  const weekEventDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    .filter(dayHasEvents)
    .map((d) => d.getDate());

  return {
    ...SAMPLE_DAY,
    weekEventDays,
  };
}

/** Load an existing event for the edit screen (mock lookup by id). */
export async function getEvent(id: string): Promise<EventDraft> {
  const task = SAMPLE_DAY.tasks.find((t) => t.id === id);
  return {
    title: task?.title ?? "",
    date: toISODate(new Date()),
    start: task?.start ?? "10:00",
    end: task?.end ?? "11:00",
    allDay: false,
  };
}

export async function saveEvent(
  _draft: EventDraft & { id?: string },
): Promise<void> {
  // TODO: POST /schedules (create) or PATCH /schedules/:id (update).
}

export async function deleteEvent(_id: string): Promise<void> {
  // TODO: DELETE /schedules/:id.
}
