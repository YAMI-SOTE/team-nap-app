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

// Newest first. Invariant: at most one entry per calendar date.
// Empty by default — nothing recorded in the past. Entries appear only
// after the user records a nap via `createNap`.
const naps: NapEntry[] = [];

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
