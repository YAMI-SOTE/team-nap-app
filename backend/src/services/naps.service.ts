/**
 * Single source of truth for the signed-in user's nap records.
 * `naps.controller` serves the full history; `stats.service` derives the
 * personal nap metrics from here so the two stay in sync.
 */

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

const TIMEZONE = "Asia/Tokyo";

function labelFor(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(new Date(y, m - 1, d));
  return `${m}月${d}日 (${weekday})`;
}

function isoOffsetFromToday(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function entry(
  daysAgo: number,
  index: number,
  start: string,
  end: string,
  minutes: number,
  wakeStars: number,
  focusDeltaPt: number,
): NapEntry {
  const date = isoOffsetFromToday(daysAgo);
  return {
    id: `nap-${daysAgo}-${index}`,
    date,
    dateLabel: labelFor(date),
    start,
    end,
    minutes,
    wakeStars,
    focusDeltaPt,
  };
}

// Newest first.
const naps: NapEntry[] = [
  entry(0, 0, "14:32", "14:47", 15, 4, 20),
  entry(1, 0, "13:50", "14:08", 18, 5, 24),
  entry(2, 0, "14:05", "14:20", 15, 4, 16),
  entry(2, 1, "11:20", "11:32", 12, 3, 8),
  entry(4, 0, "13:40", "13:58", 18, 4, 18),
  entry(6, 0, "14:10", "14:24", 14, 4, 14),
  entry(9, 0, "12:55", "13:12", 17, 5, 22),
];

export function listNaps(): NapEntry[] {
  return naps;
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
    weekCount: naps.filter((n) => n.date >= isoOffsetFromToday(6)).length,
  };
}
