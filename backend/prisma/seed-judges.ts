/**
 * Judge / demo dataset: 15 fully configured accounts across 3 teams.
 *
 * Built so that opening the app as any of these accounts immediately shows
 * a populated product rather than empty states. Every account is
 * onboarded, belongs to a team, has nap history for this week and last,
 * and has a day of calendar events (the free-slot card needs events on
 * *both* sides of a gap, and returns nothing at all for a day with no
 * events, so an empty calendar would hide the feature entirely).
 *
 * The three teams are deliberately in different shape so the score-driven
 * copy can be seen without editing data:
 *
 *   デザイン部 — lots of naps, good wake ratings   → "good"
 *   開発部     — a moderate week                    → "normal"
 *   営業部     — barely resting                     → "needs_improvement"
 *
 * Presence is seeded across all three states (作業中 / 仮眠中 / オフライン)
 * by writing `lastSeenAt` directly: recent reads as online, stale reads as
 * offline, and `activity: "resting"` shows 仮眠中. See
 * `services/team-presence.service.ts`.
 *
 * Idempotent — every write is an upsert keyed on a fixed id, so running it
 * repeatedly returns the same state.
 */

import type { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/password.js";
import { buildAdvice } from "../src/services/nap-advice.service.js";

/** One password for all 15 accounts, so a judge only memorises one. */
export const JUDGE_PASSWORD = "judge2026";

type Presence =
  | { activity: "online"; seen: "recent" }
  | { activity: "online"; seen: "stale" }
  | { activity: "resting"; seen: "recent" };

type JudgeMember = {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  presence: Presence;
  wakeAssistEnabled: boolean;
  bedtime: string;
  wakeTime: string;
  /** Naps recorded this week / last week. Drives the score and ranking. */
  napsThisWeek: number;
  napsLastWeek: number;
  /** Typical wake rating (1–5) for this member's naps. */
  wakeStars: number;
  focusDeltaPt: number;
};

type JudgeTeam = {
  inviteCode: string;
  name: string;
  members: JudgeMember[];
};

const ONLINE: Presence = { activity: "online", seen: "recent" };
const OFFLINE: Presence = { activity: "online", seen: "stale" };
const RESTING: Presence = { activity: "resting", seen: "recent" };

/** `30000000-…-0001` upward, so ids are stable across re-seeds. */
const id = (n: number) =>
  `30000000-0000-0000-0000-${`${n}`.padStart(12, "0")}`;

export const JUDGE_TEAMS: JudgeTeam[] = [
  {
    inviteCode: "NAP-J001",
    name: "デザイン部",
    members: [
      { id: id(1), email: "design1@teamnap.app", name: "青木 美咲", avatar: "woman", presence: ONLINE, wakeAssistEnabled: true, bedtime: "23:00", wakeTime: "07:00", napsThisWeek: 4, napsLastWeek: 3, wakeStars: 5, focusDeltaPt: 20 },
      { id: id(2), email: "design2@teamnap.app", name: "石川 悠斗", avatar: "man", presence: RESTING, wakeAssistEnabled: true, bedtime: "00:00", wakeTime: "07:30", napsThisWeek: 3, napsLastWeek: 3, wakeStars: 4, focusDeltaPt: 10 },
      { id: id(3), email: "design3@teamnap.app", name: "上田 かおり", avatar: "woman", presence: ONLINE, wakeAssistEnabled: false, bedtime: "23:30", wakeTime: "06:30", napsThisWeek: 4, napsLastWeek: 2, wakeStars: 4, focusDeltaPt: 10 },
      { id: id(4), email: "design4@teamnap.app", name: "遠藤 拓真", avatar: "man", presence: OFFLINE, wakeAssistEnabled: true, bedtime: "01:00", wakeTime: "08:00", napsThisWeek: 3, napsLastWeek: 1, wakeStars: 4, focusDeltaPt: 10 },
      { id: id(5), email: "design5@teamnap.app", name: "大西 結菜", avatar: null, presence: ONLINE, wakeAssistEnabled: true, bedtime: "23:00", wakeTime: "06:00", napsThisWeek: 4, napsLastWeek: 4, wakeStars: 5, focusDeltaPt: 20 },
    ],
  },
  {
    inviteCode: "NAP-J002",
    name: "開発部",
    members: [
      { id: id(6), email: "dev1@teamnap.app", name: "加藤 直樹", avatar: "man", presence: ONLINE, wakeAssistEnabled: true, bedtime: "01:30", wakeTime: "08:30", napsThisWeek: 2, napsLastWeek: 2, wakeStars: 3, focusDeltaPt: 0 },
      { id: id(7), email: "dev2@teamnap.app", name: "木下 彩", avatar: "woman", presence: RESTING, wakeAssistEnabled: true, bedtime: "00:30", wakeTime: "07:30", napsThisWeek: 2, napsLastWeek: 1, wakeStars: 4, focusDeltaPt: 10 },
      { id: id(8), email: "dev3@teamnap.app", name: "小林 陽介", avatar: "man", presence: OFFLINE, wakeAssistEnabled: false, bedtime: "02:00", wakeTime: "09:00", napsThisWeek: 1, napsLastWeek: 2, wakeStars: 3, focusDeltaPt: 0 },
      { id: id(9), email: "dev4@teamnap.app", name: "佐々木 楓", avatar: "woman", presence: ONLINE, wakeAssistEnabled: true, bedtime: "23:30", wakeTime: "07:00", napsThisWeek: 2, napsLastWeek: 2, wakeStars: 3, focusDeltaPt: 10 },
      { id: id(10), email: "dev5@teamnap.app", name: "斉藤 健", avatar: null, presence: ONLINE, wakeAssistEnabled: true, bedtime: "01:00", wakeTime: "08:00", napsThisWeek: 1, napsLastWeek: 1, wakeStars: 3, focusDeltaPt: 0 },
    ],
  },
  {
    inviteCode: "NAP-J003",
    name: "営業部",
    members: [
      { id: id(11), email: "sales1@teamnap.app", name: "髙橋 玲奈", avatar: "woman", presence: ONLINE, wakeAssistEnabled: true, bedtime: "00:30", wakeTime: "06:30", napsThisWeek: 1, napsLastWeek: 1, wakeStars: 3, focusDeltaPt: 0 },
      { id: id(12), email: "sales2@teamnap.app", name: "谷口 亮", avatar: "man", presence: OFFLINE, wakeAssistEnabled: true, bedtime: "02:00", wakeTime: "07:00", napsThisWeek: 0, napsLastWeek: 1, wakeStars: 2, focusDeltaPt: -10 },
      { id: id(13), email: "sales3@teamnap.app", name: "中村 さくら", avatar: "woman", presence: ONLINE, wakeAssistEnabled: false, bedtime: "01:00", wakeTime: "06:00", napsThisWeek: 1, napsLastWeek: 0, wakeStars: 3, focusDeltaPt: 0 },
      { id: id(14), email: "sales4@teamnap.app", name: "野村 大輔", avatar: "man", presence: OFFLINE, wakeAssistEnabled: true, bedtime: "02:30", wakeTime: "08:00", napsThisWeek: 0, napsLastWeek: 0, wakeStars: 2, focusDeltaPt: -10 },
      { id: id(15), email: "sales5@teamnap.app", name: "橋本 千尋", avatar: null, presence: ONLINE, wakeAssistEnabled: true, bedtime: "01:30", wakeTime: "07:30", napsThisWeek: 1, napsLastWeek: 1, wakeStars: 3, focusDeltaPt: 0 },
    ],
  },
];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const pad = (n: number) => `${n}`.padStart(2, "0");
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

/** Monday of the week containing `d`. */
function mondayOf(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7));
}

/** Nap start times, spread so members don't all nap at the same minute. */
const NAP_STARTS = ["13:00", "13:45", "14:30", "15:15", "16:00"];

/**
 * A day of meetings with gaps between them, seeded across the whole
 * working week.
 *
 * `getNextFreeSlot` returns nothing for a day with no events at all — a
 * wholly empty day is "no plans", not a gap — so an empty calendar hides
 * the Home free-slot card entirely. Seeding only "today" also demos badly
 * in the evening, when every meeting is already in the past and the only
 * gap left runs to midnight; covering Mon–Fri means the schedule screen
 * and the free-slot card both have something to show whenever the app is
 * opened.
 */
const DAY_EVENTS = [
  { title: "朝会", start: "09:30", end: "10:00" },
  { title: "定例ミーティング", start: "11:00", end: "12:00" },
  { title: "ランチ", start: "12:00", end: "13:00" },
  { title: "レビュー", start: "16:30", end: "17:30" },
];

export type JudgeSeedSummary = {
  teams: number;
  users: number;
  naps: number;
  events: number;
};

export async function seedJudges(
  prisma: PrismaClient,
): Promise<JudgeSeedSummary> {
  const passwordHash = await hashPassword(JUDGE_PASSWORD);
  const now = new Date();
  const today = isoDate(now);
  const thisMonday = mondayOf(now);
  const lastMonday = addDays(thisMonday, -7);

  const allIds = JUDGE_TEAMS.flatMap((t) => t.members.map((m) => m.id));
  // Re-seedable: wipe this cohort's generated rows before rebuilding them.
  await prisma.napRecord.deleteMany({ where: { userId: { in: allIds } } });
  await prisma.calendarEvent.deleteMany({ where: { userId: { in: allIds } } });

  let naps = 0;
  let events = 0;

  for (const team of JUDGE_TEAMS) {
    const normalized = team.inviteCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const row = await prisma.team.upsert({
      where: { inviteCode: team.inviteCode },
      update: { name: team.name, inviteCodeNormalized: normalized },
      create: {
        name: team.name,
        inviteCode: team.inviteCode,
        inviteCodeNormalized: normalized,
      },
    });

    for (const [index, m] of team.members.entries()) {
      await prisma.user.upsert({
        where: { id: m.id },
        update: { email: m.email, name: m.name, avatar: m.avatar, passwordHash },
        create: {
          id: m.id,
          email: m.email,
          name: m.name,
          avatar: m.avatar,
          passwordHash,
        },
      });

      // "recent" keeps them inside OFFLINE_AFTER_MS; "stale" is far past it.
      const lastSeenAt =
        m.presence.seen === "recent"
          ? new Date(now.getTime() - 30_000)
          : new Date(now.getTime() - 6 * 60 * 60_000);

      await prisma.teamMembership.upsert({
        where: { userId: m.id },
        update: {
          teamId: row.id,
          activity: m.presence.activity,
          wakeAssistEnabled: m.wakeAssistEnabled,
          role: index === 0 ? "owner" : "member",
          lastSeenAt,
        },
        create: {
          teamId: row.id,
          userId: m.id,
          activity: m.presence.activity,
          wakeAssistEnabled: m.wakeAssistEnabled,
          role: index === 0 ? "owner" : "member",
          lastSeenAt,
        },
      });

      await prisma.onboarding.upsert({
        where: { userId: m.id },
        update: {
          completedAt: new Date(),
          bedtime: m.bedtime,
          wakeTime: m.wakeTime,
          notificationsEnabled: true,
        },
        create: {
          userId: m.id,
          completedAt: new Date(),
          bedtime: m.bedtime,
          wakeTime: m.wakeTime,
          notificationsEnabled: true,
        },
      });

      // --- nap history -------------------------------------------------
      const napRows: {
        userId: string;
        date: string;
        start: string;
        end: string;
        minutes: number;
        wakeStars: number;
        focusDeltaPt: number;
        aiAdvice: string;
      }[] = [];

      const push = (base: Date, count: number) => {
        for (let i = 0; i < count; i += 1) {
          const date = isoDate(addDays(base, i));
          // Never seed a nap dated in the future.
          if (date > today) continue;
          const start = NAP_STARTS[(index + i) % NAP_STARTS.length];
          const minutes = 15 + ((index + i) % 3) * 5;
          napRows.push({
            userId: m.id,
            date,
            start,
            end: addMinutes(start, minutes),
            minutes,
            wakeStars: m.wakeStars,
            focusDeltaPt: m.focusDeltaPt,
            aiAdvice: buildAdvice({
              minutes,
              wakeStars: m.wakeStars,
              focusDeltaPt: m.focusDeltaPt,
              start,
            }),
          });
        }
      };
      push(thisMonday, m.napsThisWeek);
      push(lastMonday, m.napsLastWeek);

      if (napRows.length > 0) {
        await prisma.napRecord.createMany({ data: napRows });
        naps += napRows.length;
      }

      // --- meetings, Mon–Fri of the current week ------------------------
      const eventRows = [];
      for (let day = 0; day < 5; day += 1) {
        const date = isoDate(addDays(thisMonday, day));
        for (const e of DAY_EVENTS) {
          eventRows.push({
            userId: m.id,
            title: e.title,
            date,
            start: e.start,
            end: e.end,
            allDay: false,
            source: "manual",
          });
        }
      }
      await prisma.calendarEvent.createMany({ data: eventRows });
      events += eventRows.length;
    }
  }

  return {
    teams: JUDGE_TEAMS.length,
    users: allIds.length,
    naps,
    events,
  };
}
