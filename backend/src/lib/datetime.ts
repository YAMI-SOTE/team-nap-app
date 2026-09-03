/**
 * Date/time helpers shared by the mock services. Previously each of
 * `home`, `naps`, `schedule` (service + controller) carried its own copy
 * of these. Behaviour is preserved exactly:
 *   - `todayISO` / `isoDateOffset` use the server's local calendar day
 *     (as the schedule and naps seeds always have).
 *   - `jstTodayLabel` / `jstDateLabelFromISO` render the "M月D日 (曜)"
 *     label in Asia/Tokyo (as home and naps always have).
 */

export const TIMEZONE = "Asia/Tokyo";

function pad(value: number): string {
  return `${value}`.padStart(2, "0");
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local-calendar today as "YYYY-MM-DD". */
export function todayISO(): string {
  return toISO(new Date());
}

/** Local-calendar day `days` away from today (negative = past). */
export function isoDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISO(date);
}

/**
 * The calendar week — **Sunday through Saturday** — containing `ref`.
 * This is the single definition of "今週" across the app (stats count,
 * condition graph, "先週より" delta, schedule week strip).
 */
export function calendarWeek(ref: Date = new Date()): {
  /** Sunday, "YYYY-MM-DD". */
  start: string;
  /** Saturday, "YYYY-MM-DD". */
  end: string;
  /** The 7 day strings, Sunday → Saturday. */
  days: string[];
} {
  const sunday = new Date(ref);
  sunday.setDate(ref.getDate() - ref.getDay()); // getDay(): 0 = Sunday
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return toISO(d);
  });
  return { start: days[0], end: days[6], days };
}

/** The calendar week `weeksAgo` weeks before the one containing today. */
export function calendarWeekAgo(weeksAgo: number): ReturnType<typeof calendarWeek> {
  const ref = new Date();
  ref.setDate(ref.getDate() - weeksAgo * 7);
  return calendarWeek(ref);
}

/** "M月D日 (曜)" for the given date, rendered in JST. */
export function jstTodayLabel(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TIMEZONE,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("month")}月${get("day")}日 (${get("weekday")})`;
}

/** "M月D日 (曜)" for a "YYYY-MM-DD" string; month/day taken literally. */
export function jstDateLabelFromISO(dateISO: string): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(new Date(year, month - 1, day));
  return `${month}月${day}日 (${weekday})`;
}

/**
 * Time from `now` until the next occurrence of "HH:MM" (today, or
 * tomorrow if it has already passed), as whole hours + remainder minutes.
 */
export function timeUntil(
  targetTime: string,
  now: Date = new Date(),
): { hours: number; minutes: number } {
  const zonedNow = new Date(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .format(now)
      .replace(",", ""),
  );

  const [hours, minutes] = targetTime.split(":").map(Number);
  const target = new Date(zonedNow);
  target.setHours(hours, minutes, 0, 0);

  let diffMinutes = Math.round((target.getTime() - zonedNow.getTime()) / 60000);
  if (diffMinutes < 0) {
    target.setDate(target.getDate() + 1);
    diffMinutes = Math.round((target.getTime() - zonedNow.getTime()) / 60000);
  }

  return {
    hours: Math.floor(diffMinutes / 60),
    minutes: diffMinutes % 60,
  };
}


export type ZonedDateTime = {
  date: string;
  time: string;
};

/**
 * Asia/Tokyo の現在日付・現在時刻を返す。
 *
 * 例:
 * {
 *   date: "2026-09-03",
 *   time: "14:30"
 * }
 */
export function jstNow(now: Date = new Date()): ZonedDateTime {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}