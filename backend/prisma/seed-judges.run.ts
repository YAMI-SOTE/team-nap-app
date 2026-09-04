/** Standalone entry point: `npm run db:seed:judges`. */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { JUDGE_PASSWORD, JUDGE_TEAMS, seedJudges } from "./seed-judges.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const summary = await seedJudges(prisma);
console.log(
  `Judge dataset: ${summary.users} users in ${summary.teams} teams, ` +
    `${summary.naps} naps, ${summary.events} calendar events.`,
);
console.log(`Password for every account: ${JUDGE_PASSWORD}`);
for (const team of JUDGE_TEAMS) {
  console.log(`\n  ${team.name}  (invite ${team.inviteCode})`);
  for (const m of team.members) {
    console.log(`    ${m.email.padEnd(24)} ${m.name}`);
  }
}
await prisma.$disconnect();
