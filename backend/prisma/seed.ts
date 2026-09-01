import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEV_USER_ID =
  process.env.DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001";

// Every seeded account logs in with this password (dev only).
const DEV_PASSWORD = "teamnap-dev";

const USERS = [
  { id: DEV_USER_ID, email: "dev@teamnap.local", name: "あなた" },
  { id: "10000000-0000-0000-0000-00000000000b", email: "b@teamnap.local", name: "佐藤" },
  { id: "10000000-0000-0000-0000-00000000000c", email: "c@teamnap.local", name: "鈴木" },
  { id: "10000000-0000-0000-0000-00000000000d", email: "d@teamnap.local", name: "高橋" },
  { id: "10000000-0000-0000-0000-00000000000e", email: "e@teamnap.local", name: "田中" },
  { id: "10000000-0000-0000-0000-00000000000f", email: "f@teamnap.local", name: "渡辺" },
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

async function main() {
  const passwordHash = await hashPassword(DEV_PASSWORD);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { email: u.email, name: u.name, passwordHash },
      create: { ...u, passwordHash },
    });
  }

  const team = await prisma.team.upsert({
    where: { inviteCode: "NAP-4821" },
    update: { name: "TEAM NAP 開発チーム" },
    create: { name: "TEAM NAP 開発チーム", inviteCode: "NAP-4821" },
  });

  for (const m of MEMBERSHIPS) {
    await prisma.teamMembership.upsert({
      where: { userId: m.userId },
      update: {
        teamId: team.id,
        activity: m.activity,
        wakeAssistEnabled: m.wakeAssistEnabled,
      },
      create: { teamId: team.id, ...m },
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
  const sampleTeam = await prisma.team.upsert({
    where: { inviteCode: SAMPLE_TEAM.inviteCode },
    update: { name: SAMPLE_TEAM.name },
    create: { name: SAMPLE_TEAM.name, inviteCode: SAMPLE_TEAM.inviteCode },
  });
  for (const m of SAMPLE_MEMBERS) {
    await prisma.user.upsert({
      where: { id: m.id },
      update: { email: m.email, name: m.name, passwordHash: sampleHash },
      create: { id: m.id, email: m.email, name: m.name, passwordHash: sampleHash },
    });
    await prisma.teamMembership.upsert({
      where: { userId: m.id },
      update: {
        teamId: sampleTeam.id,
        activity: m.activity,
        wakeAssistEnabled: m.wakeAssistEnabled,
      },
      create: {
        teamId: sampleTeam.id,
        userId: m.id,
        activity: m.activity,
        wakeAssistEnabled: m.wakeAssistEnabled,
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

  console.log(
    `Seeded ${USERS.length} users + team "${team.name}" (${team.inviteCode}) with ${MEMBERSHIPS.length} members.`,
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
