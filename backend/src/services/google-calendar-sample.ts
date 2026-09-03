/**
 * A canned week of "Google Calendar" events.
 *
 * There is no real Google OAuth in this project — connecting the calendar
 * (`POST /settings/calendar/google/sync`) imports this sample set into the
 * user's own `CalendarEvent` store instead. The same generator seeds
 * `sample@teamnap.app` so the スケジュール screen has data out of the box.
 *
 * Events are anchored to the Monday of the reference week, so "this week"
 * always has a full schedule, with 15-min-plus gaps left open for the nap
 * recommendation to land in. A couple of next-week entries are included so
 * browsing forward isn't empty.
 */

export type SampleCalendarEvent = {
  /** Stable id from the "source" system — unique per user. */
  externalId: string;
  title: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
  allDay: boolean;
};

function pad(n: number): string {
  return `${n}`.padStart(2, "0");
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday of the calendar week containing `ref` (local time). */
function mondayOf(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  // getDay(): 0 = Sun … 6 = Sat. Shift so Monday is the anchor.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

type Slot = {
  /** Days from the week's Monday (0 = Mon … 6 = Sun). */
  offset: number;
  slug: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
};

// One work week. Mornings have a stand-up, afternoons keep a clear gap
// somewhere between 13:00–16:00 for a nap.
const THIS_WEEK: Slot[] = [
  { offset: 0, slug: "standup", title: "朝会", start: "09:30", end: "09:45" },
  { offset: 0, slug: "dept-sync", title: "部門定例", start: "11:00", end: "12:00" },
  { offset: 0, slug: "one-on-one", title: "1on1", start: "15:30", end: "16:00" },
  { offset: 1, slug: "standup", title: "朝会", start: "09:30", end: "09:45" },
  { offset: 1, slug: "design-review", title: "設計レビュー", start: "13:30", end: "14:30" },
  { offset: 1, slug: "client", title: "顧客ミーティング", start: "16:00", end: "17:00" },
  { offset: 2, slug: "all-hands", title: "全体会議", start: "10:00", end: "11:00" },
  { offset: 2, slug: "lunch-study", title: "ランチ勉強会", start: "12:00", end: "13:00" },
  { offset: 3, slug: "standup", title: "朝会", start: "09:30", end: "09:45" },
  { offset: 3, slug: "sprint-review", title: "スプリントレビュー", start: "14:00", end: "15:00" },
  { offset: 4, slug: "training", title: "社内研修", start: "00:00", end: "23:59", allDay: true },
];

const NEXT_WEEK: Slot[] = [
  { offset: 7, slug: "standup", title: "朝会", start: "09:30", end: "09:45" },
  { offset: 8, slug: "all-hands", title: "全体会議", start: "10:00", end: "11:00" },
];

function build(monday: Date, slots: Slot[]): SampleCalendarEvent[] {
  return slots.map((s) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + s.offset);
    const date = toISO(d);
    return {
      externalId: `gcal-${date}-${s.slug}`,
      title: s.title,
      date,
      start: s.start,
      end: s.end,
      allDay: s.allDay ?? false,
    };
  });
}

/** The sample "Google" events for the week containing `ref`. */
export function googleSampleEvents(ref: Date = new Date()): SampleCalendarEvent[] {
  const monday = mondayOf(ref);
  return [...build(monday, THIS_WEEK), ...build(monday, NEXT_WEEK)];
}
