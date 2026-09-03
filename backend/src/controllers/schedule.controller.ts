import type { Request, Response } from "express";

import { firstParam } from "../lib/params.js";
import { requireUserId } from "../lib/request-user.js";
import { HttpError } from "../lib/http-error.js";
import { todayISO } from "../lib/datetime.js";
import {
  createEvent,
  deleteEvent,
  getDaySchedule,
  getEvent,
  updateEvent,
  type EventDraft,
} from "../services/schedule.service.js";

export async function getDayScheduleController(req: Request, res: Response) {
  const date =
    typeof req.query.date === "string" ? req.query.date : todayISO();
  res.status(200).json(await getDaySchedule(requireUserId(req), date));
}

export async function getEventController(req: Request, res: Response) {
  const draft = await getEvent(requireUserId(req), firstParam(req, "id"));
  if (!draft) {
    throw HttpError.notFound("予定が見つかりません");
  }
  res.status(200).json(draft);
}

export async function createEventController(req: Request, res: Response) {
  res
    .status(201)
    .json(await createEvent(requireUserId(req), req.body as EventDraft));
}

export async function updateEventController(req: Request, res: Response) {
  const updated = await updateEvent(
    requireUserId(req),
    firstParam(req, "id"),
    req.body as EventDraft,
  );
  if (!updated) {
    throw HttpError.notFound("予定が見つかりません");
  }
  res.status(200).json(updated);
}

export async function deleteEventController(req: Request, res: Response) {
  if (!(await deleteEvent(requireUserId(req), firstParam(req, "id")))) {
    throw HttpError.notFound("予定が見つかりません");
  }
  res.status(204).end();
}
