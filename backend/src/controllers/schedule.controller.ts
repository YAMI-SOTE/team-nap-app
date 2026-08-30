import type { Request, Response } from "express";

import {
  createEvent,
  deleteEvent,
  getDaySchedule,
  getEvent,
  updateEvent,
  type EventDraft,
} from "../services/schedule.service.js";

function normalizeDraft(body: unknown): EventDraft {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    title: typeof b.title === "string" ? b.title : "",
    date: typeof b.date === "string" ? b.date : todayISO(),
    start: typeof b.start === "string" ? b.start : "10:00",
    end: typeof b.end === "string" ? b.end : "11:00",
    allDay: b.allDay === true,
  };
}

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : (value ?? "");
}

export function getDayScheduleController(req: Request, res: Response) {
  const date =
    typeof req.query.date === "string" ? req.query.date : todayISO();
  res.status(200).json(getDaySchedule(date));
}

export function getEventController(req: Request, res: Response) {
  const draft = getEvent(param(req.params.id));
  if (!draft) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.status(200).json(draft);
}

export function createEventController(req: Request, res: Response) {
  res.status(201).json(createEvent(normalizeDraft(req.body)));
}

export function updateEventController(req: Request, res: Response) {
  const updated = updateEvent(param(req.params.id), normalizeDraft(req.body));
  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.status(200).json(updated);
}

export function deleteEventController(req: Request, res: Response) {
  const ok = deleteEvent(param(req.params.id));
  if (!ok) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.status(204).end();
}
