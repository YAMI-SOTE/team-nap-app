/**
 * Single source of truth for the signed-in user's nap records.
 * `naps.controller` serves the full history; `stats.service` derives the
 * personal nap metrics from here so the two stay in sync.
 */

import { isoDateOffset, jstDateLabelFromISO } from "../lib/datetime.js";
import { HttpError } from "../lib/http-error.js";

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
};

function entry(
  daysAgo: number,
  index: number,
  start: string,
  end: string,
  minutes: number,
  wakeStars: number,
  focusDeltaPt: number,
): NapEntry {
  const date = isoDateOffset(-daysAgo);
  return {
    id: `nap-${daysAgo}-${index}`,
    date,
    dateLabel: jstDateLabelFromISO(date),
    start,
    end,
    minutes,
    wakeStars,
    focusDeltaPt,
  };
}

// Newest first. Invariant: at most one entry per calendar date.
const naps: NapEntry[] = [
  entry(0, 0, "14:32", "14:47", 15, 4, 20),
  entry(1, 0, "13:25", "14:08", 18, 5, 24),
  entry(2, 0, "14:05", "14:20", 15, 4, 16),
  entry(4, 0, "13:40", "13:58", 18, 4, 18),
  entry(6, 0, "14:10", "14:24", 14, 4, 14),
  entry(9, 0, "12:55", "13:12", 17, 5, 22),
];

let createdNapSeq = 1;

export function listNaps(): NapEntry[] {
  return naps;
}

/** Whether a nap is already recorded for the given "YYYY-MM-DD". */
export function hasNapOn(dateISO: string): boolean {
  return naps.some((nap) => nap.date === dateISO);
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
 * Record a nap. Only one nap per date is allowed — a second on the same
 * date is a 409.
 */
export function createNap(input: NapInput): NapEntry {
  if (hasNapOn(input.date)) {
    throw HttpError.conflict("この日の仮眠は既に記録されています");
  }

  const nap: NapEntry = {
    id: `nap-new-${createdNapSeq++}`,
    date: input.date,
    dateLabel: jstDateLabelFromISO(input.date),
    start: input.start,
    end: input.end,
    minutes: input.minutes,
    wakeStars: input.wakeStars,
    focusDeltaPt: input.focusDeltaPt,
  };

  naps.unshift(nap);
  return nap;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function getNapSummary() {
  return {
    monthlyCount: naps.length,
    avgMinutes: Math.round(average(naps.map((n) => n.minutes))),
    avgWakeRating: Math.round(average(naps.map((n) => n.wakeStars)) * 10) / 10,
    /** Naps within the last 7 days. */
    weekCount: naps.filter((n) => n.date >= isoDateOffset(-6)).length,
  };
}
