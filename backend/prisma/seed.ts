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

  console.log(
    `Seeded ${USERS.length} users + team "${team.name}" (${team.inviteCode}) with ${MEMBERSHIPS.length} members.`,
  );
  console.log(
    `Login: ${USERS[0].email} / ${DEV_PASSWORD} (same password for every seeded user).`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
