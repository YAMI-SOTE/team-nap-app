import { api } from "@/services/api";
import { toISODate } from "@/utils/date";

import type { DayScheduleResponse, EventDraft } from "@/types/api";

export async function getDaySchedule(
  date: Date,
): Promise<DayScheduleResponse> {
  return api.get<DayScheduleResponse>(
    `/schedule/day?date=${encodeURIComponent(toISODate(date))}`,
  );
}

export async function getEvent(id: string): Promise<EventDraft> {
  return api.get<EventDraft>(
    `/schedule/events/${encodeURIComponent(id)}`,
  );
}

export async function saveEvent(
  draft: EventDraft & { id?: string },
): Promise<void> {
  const { id, ...body } = draft;
  if (id) {
    await api.put(`/schedule/events/${encodeURIComponent(id)}`, body);
  } else {
    await api.post("/schedule/events", body);
  }
}

export async function deleteEvent(id: string): Promise<void> {
  await api.del(`/schedule/events/${encodeURIComponent(id)}`);
}
