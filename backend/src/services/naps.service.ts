/**
 * Nap records — DB-backed and per-user. `naps.controller` serves the
 * history and a single record; `stats.service` derives the personal nap
 * metrics from `listNaps` so the two stay in sync.
 */

import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { jstDateLabelFromISO } from "../lib/datetime.js";
import { buildAdvice } from "./nap-advice.service.js";
import { generateNapAdvice } from "./ai.service.js";
import { endNapSession } from "./nap-session.service.js";

export type NapEntry = {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "8月21日 (水)" */
  dateLabel: string;
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
  minutes: number;
  /** Wake-up rating, 0–5. */
  wakeStars: number;
  /** Focus improvement in points. */
  focusDeltaPt: number;
  /** AI advice generated at record time. */
  aiAdvice: string | null;
};

type Row = {
  id: string;
  date: string;
  start: string;
  end: string;
  minutes: number;
  wakeStars: number;
  focusDeltaPt: number;
  aiAdvice: string | null;
};

function toEntry(row: Row): NapEntry {
  return {
    id: row.id,
    date: row.date,
    dateLabel: jstDateLabelFromISO(row.date),
    start: row.start,
    end: row.end,
    minutes: row.minutes,
    wakeStars: row.wakeStars,
    focusDeltaPt: row.focusDeltaPt,
    aiAdvice: row.aiAdvice,
  };
}

/** Newest first (by date, then by insertion order for same-day naps). */
export async function listNaps(userId: string): Promise<NapEntry[]> {
  const rows = await prisma.napRecord.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toEntry);
}

export async function getNap(
  userId: string,
  id: string,
): Promise<NapEntry> {
  const row = await prisma.napRecord.findUnique({ where: { id } });
  if (!row || row.userId !== userId) {
    throw HttpError.notFound("仮眠の記録が見つかりません");
  }
  return toEntry(row);
}

export type NapInput = {
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
  minutes: number;
  wakeStars: number;
  focusDeltaPt: number;
};

/**
 * Record a nap and generate + store its AI advice in the same call.
 * A user may record more than one nap on the same calendar date.
 */
export async function createNap(
  userId: string,
  input: NapInput,
): Promise<NapEntry> {
  let aiAdvice: string;

  try {
    aiAdvice = await generateNapAdvice({
      minutes: input.minutes,
      wakeStars: input.wakeStars,
      focusDeltaPt: input.focusDeltaPt,
      start: input.start,
    });
  } catch (error) {
    console.error("Nap AI generation failed:", error);

    aiAdvice = buildAdvice({
      minutes: input.minutes,
      wakeStars: input.wakeStars,
      focusDeltaPt: input.focusDeltaPt,
      start: input.start,
    });
  }

  const row = await prisma.napRecord.create({
    data: { userId, ...input, aiAdvice },
  });

  // The nap is over — clear any live session so the teammate card drops.
  await endNapSession(userId);

  return toEntry(row);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export async function getNapSummary(userId: string) {
  const naps = await listNaps(userId);
  return {
    /** All-time count (used by the 仮眠履歴 summary). */
    monthlyCount: naps.length,
    avgMinutes: Math.round(average(naps.map((n) => n.minutes))),
    avgWakeRating: Math.round(average(naps.map((n) => n.wakeStars)) * 10) / 10,
  };
}