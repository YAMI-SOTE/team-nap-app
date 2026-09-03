import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/password.js";
import { buildAdvice } from "../src/services/nap-advice.service.js";
import { googleSampleEvents } from "../src/services/google-calendar-sample.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEV_USER_ID =
  process.env.DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001";

// Every seeded account logs in with this password (dev only).
const DEV_PASSWORD = "teamnap-dev";

const USERS = [
  { id: DEV_USER_ID, email: "dev@teamnap.local", name: "あなた", avatar: "cat" },
  { id: "10000000-0000-0000-0000-00000000000b", email: "b@teamnap.local", name: "佐藤", avatar: "man" },
  { id: "10000000-0000-0000-0000-00000000000c", email: "c@teamnap.local", name: "鈴木", avatar: "woman" },
  { id: "10000000-0000-0000-0000-00000000000d", email: "d@teamnap.local", name: "高橋", avatar: "man" },
  { id: "10000000-0000-0000-0000-00000000000e", email: "e@teamnap.local", name: "田中", avatar: "woman" },
  { id: "10000000-0000-0000-0000-00000000000f", email: "f@teamnap.local", name: "渡辺", avatar: null },
];

const MEMBERSHIPS = [
  { userId: USERS[0].id, activity: "online" as const, wakeAssistEnabled: true },
  { userId: USERS[1].id, activity: "resting" as const, wakeAssistEnabled: true },
  { userId: USERS[2].id, activity: "online" as const, wakeAssistEnabled: false },
  { userId: USERS[3].id, activity: "online" as const, wakeAssistEnabled: true },
  { userId: USERS[4].id, activity: "resting" as const, wakeAssistEnabled: true },
  { userId: USERS[5].id, activity: "online" as const, wakeAssistEnabled: true },
];

/**
 * A ready-to-use test team (documented in docs/testing-guide.md). Every
 * member is fully onboarded and logs in with `SAMPLE_PASSWORD`, so team
 * features (member list, live status display, nudges, nap suggestion,
 * ranking) can be exercised by signing in as different members.
 */
const SAMPLE_PASSWORD = "samplepass123";
const SAMPLE_TEAM = {
  inviteCode: "NAP-2001",
  name: "サンプルチーム",
};
const SAMPLE_MEMBERS = [
  {
    id: "20000000-0000-0000-0000-000000000001",
    email: "sample@teamnap.app",
    name: "サンプル 太郎",
    activity: "online" as const,
    wakeAssistEnabled: true,
    bedtime: "23:00",
    wakeTime: "07:00",
  },
  {
    id: "20000000-0000-0000-0000-000000000002",
    email: "hanako@teamnap.app",
    name: "サンプル 花子",
    activity: "resting" as const,
    wakeAssistEnabled: true,
    bedtime: "23:30",
    wakeTime: "06:30",
  },
  {
    id: "20000000-0000-0000-0000-000000000003",
    email: "jiro@teamnap.app",
    name: "サンプル 次郎",
    activity: "online" as const,
    wakeAssistEnabled: false, // wake nudge to this member -> 409
    bedtime: "00:30",
    wakeTime: "08:00",
  },
  {
    id: "20000000-0000-0000-0000-000000000004",
    email: "saburo@teamnap.app",
    name: "サンプル 三郎",
    activity: "resting" as const,
    wakeAssistEnabled: true,
    bedtime: "22:45",
    wakeTime: "06:45",
  },
];

// ---------------------------------------------------------------------------
// Sample nap history for サンプル 太郎 (sample@teamnap.app)
//
// Gives the personal 統計 screen real numbers to show: a weekly 仮眠スコア,
// the 今週のコンディション line (one point per day), a 先週より delta, and
// rows under 最近の仮眠 / 仮眠履歴. Dates are anchored to the current week's
// Monday so "this week" always has data; nothing in the future is seeded.
// ---------------------------------------------------------------------------
const SAMPLE_NAP_USER_ID = SAMPLE_MEMBERS[0].id; // サンプル 太郎

type NapSpec = {
  /** Days from the week's Monday (0 = Mon … 6 = Sun). */
  offset: number;
  start: string;
  minutes: number;
  wakeStars: number;
  focusDeltaPt: number;
};

// Relative to *this* week's Monday.
const THIS_WEEK_NAPS: NapSpec[] = [
  { offset: 0, start: "13:45", minutes: 20, wakeStars: 3, focusDeltaPt: 0 },
  { offset: 1, start: "14:15", minutes: 15, wakeStars: 4, focusDeltaPt: 10 },
  { offset: 2, start: "13:00", minutes: 15, wakeStars: 5, focusDeltaPt: 20 },
  { offset: 2, start: "16:10", minutes: 22, wakeStars: 3, focusDeltaPt: 0 }, // second nap same day
  { offset: 3, start: "14:00", minutes: 17, wakeStars: 4, focusDeltaPt: 10 },
  { offset: 4, start: "13:30", minutes: 25, wakeStars: 2, focusDeltaPt: -10 },
];

// Relative to *last* week's Monday.
const LAST_WEEK_NAPS: NapSpec[] = [
  { offset: 0, start: "13:30", minutes: 20, wakeStars: 3, focusDeltaPt: 0 },
  { offset: 1, start: "14:00", minutes: 18, wakeStars: 4, focusDeltaPt: 10 },
  { offset: 3, start: "15:00", minutes: 14, wakeStars: 5, focusDeltaPt: 20 },
  { offset: 4, start: "14:30", minutes: 16, wakeStars: 4, focusDeltaPt: 10 },
];

function isoAddDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${`${Math.floor(total / 60) % 24}`.padStart(2, "0")}:${`${total % 60}`.padStart(2, "0")}`;
}

async function seedSampleNaps() {
  const today = new Date();
  const todayISO = isoAddDays(today, 0);
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  const rows = [
    ...THIS_WEEK_NAPS.map((n) => ({ ...n, base: thisMonday })),
    ...LAST_WEEK_NAPS.map((n) => ({ ...n, base: lastMonday })),
  ]
    .map((n) => {
      const date = isoAddDays(n.base, n.offset);
      return {
        userId: SAMPLE_NAP_USER_ID,
        date,
        start: n.start,
        end: addMinutes(n.start, n.minutes),
        minutes: n.minutes,
        wakeStars: n.wakeStars,
        focusDeltaPt: n.focusDeltaPt,
        aiAdvice: buildAdvice({
          minutes: n.minutes,
          wakeStars: n.wakeStars,
          focusDeltaPt: n.focusDeltaPt,
          start: n.start,
        }),
      };
    })
    // Never seed a nap dated in the future (e.g. Fri when today is Wed).
    .filter((r) => r.date <= todayISO);

  // Re-seedable: clear this account's history first.
  await prisma.napRecord.deleteMany({ where: { userId: SAMPLE_NAP_USER_ID } });
  await prisma.napRecord.createMany({ data: rows });
  return rows.length;
}

// ---------------------------------------------------------------------------
// Sample schedule for サンプル 太郎 (sample@teamnap.app)
//
// A week of "imported from Google Calendar" events plus two hand-added
// ones, so the スケジュール screen has data and the CRUD (edit / delete a
// manual event, re-sync to refresh the Google ones) can be exercised.
// The account is marked as having Google Calendar connected.
// ---------------------------------------------------------------------------
async function seedSampleSchedule() {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const manual = [
    {
      title: "歯医者",
      date: isoAddDays(monday, 1), // Tue
      start: "18:30",
      end: "19:15",
      allDay: false,
      source: "manual",
      externalId: null,
    },
    {
      title: "ジム",
      date: isoAddDays(monday, 3), // Thu
      start: "07:00",
      end: "08:00",
      allDay: false,
      source: "manual",
      externalId: null,
    },
  ];

  const google = googleSampleEvents(monday).map((e) => ({
    title: e.title,
    date: e.date,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    source: "google",
    externalId: e.externalId,
  }));

  await prisma.calendarEvent.deleteMany({
    where: { userId: SAMPLE_NAP_USER_ID },
  });
  await prisma.calendarEvent.createMany({
    data: [...google, ...manual].map((e) => ({
      userId: SAMPLE_NAP_USER_ID,
      ...e,
    })),
  });
  await prisma.onboarding.update({
    where: { userId: SAMPLE_NAP_USER_ID },
    data: { calendarConnected: true, calendarLastSyncedAt: new Date() },
  });

  return google.length + manual.length;
}

async function main() {
  const passwordHash = await hashPassword(DEV_PASSWORD);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { email: u.email, name: u.name, avatar: u.avatar, passwordHash },
      create: { ...u, passwordHash },
    });
  }

  const team = await prisma.team.upsert({
    where: { inviteCode: "NAP-4821" },
    update: { name: "TEAM NAP 開発チーム", inviteCodeNormalized: "NAP4821" },
    create: {
      name: "TEAM NAP 開発チーム",
      inviteCode: "NAP-4821",
      inviteCodeNormalized: "NAP4821",
    },
  });

  for (const [i, m] of MEMBERSHIPS.entries()) {
    // The first seeded member owns the team.
    const role = i === 0 ? "owner" : "member";
    await prisma.teamMembership.upsert({
      where: { userId: m.userId },
      update: {
        teamId: team.id,
        activity: m.activity,
        wakeAssistEnabled: m.wakeAssistEnabled,
        role,
      },
      create: { teamId: team.id, role, ...m },
    });
  }

  // The primary dev user is treated as a returning user (onboarding done);
  // the others are left without an Onboarding row so the lazy-backfill /
  // "route through onboarding" path can be exercised in dev.
  await prisma.onboarding.upsert({
    where: { userId: USERS[0].id },
    update: { completedAt: new Date() },
    create: { userId: USERS[0].id, completedAt: new Date() },
  });

  // --- Sample test team (docs/testing-guide.md) ---------------------------
  const sampleHash = await hashPassword(SAMPLE_PASSWORD);
  const sampleNormalized = SAMPLE_TEAM.inviteCode
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const sampleTeam = await prisma.team.upsert({
    where: { inviteCode: SAMPLE_TEAM.inviteCode },
    update: { name: SAMPLE_TEAM.name, inviteCodeNormalized: sampleNormalized },
    create: {
      name: SAMPLE_TEAM.name,
      inviteCode: SAMPLE_TEAM.inviteCode,
      inviteCodeNormalized: sampleNormalized,
    },
  });
  for (const [i, m] of SAMPLE_MEMBERS.entries()) {
    await prisma.user.upsert({
      where: { id: m.id },
      update: { email: m.email, name: m.name, passwordHash: sampleHash },
      create: { id: m.id, email: m.email, name: m.name, passwordHash: sampleHash },
    });
    const role = i === 0 ? "owner" : "member"; // サンプル 太郎 owns the team
    await prisma.teamMembership.upsert({
      where: { userId: m.id },
      update: {
        teamId: sampleTeam.id,
        activity: m.activity,
        wakeAssistEnabled: m.wakeAssistEnabled,
        role,
      },
      create: {
        teamId: sampleTeam.id,
        userId: m.id,
        activity: m.activity,
        wakeAssistEnabled: m.wakeAssistEnabled,
        role,
      },
    });
    await prisma.onboarding.upsert({
      where: { userId: m.id },
      update: { completedAt: new Date(), bedtime: m.bedtime, wakeTime: m.wakeTime },
      create: {
        userId: m.id,
        completedAt: new Date(),
        bedtime: m.bedtime,
        wakeTime: m.wakeTime,
      },
    });
  }

  const sampleNapCount = await seedSampleNaps();
  const sampleEventCount = await seedSampleSchedule();

  console.log(
    `Seeded ${USERS.length} users + team "${team.name}" (${team.inviteCode}) with ${MEMBERSHIPS.length} members.`,
  );
  console.log(
    `Seeded ${sampleNapCount} nap records for ${SAMPLE_MEMBERS[0].email} (this week + last week).`,
  );
  console.log(
    `Seeded ${sampleEventCount} calendar events for ${SAMPLE_MEMBERS[0].email} (Google sample + manual; Google Calendar marked connected).`,
  );
  console.log(
    `Login: ${USERS[0].email} / ${DEV_PASSWORD} (same password for every seeded user).`,
  );
  console.log(
    `Sample team "${SAMPLE_TEAM.name}" (${SAMPLE_TEAM.inviteCode}), password ${SAMPLE_PASSWORD}:`,
  );
  for (const m of SAMPLE_MEMBERS) {
    console.log(`  ${m.email}  (${m.name}, ${m.activity})`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
