import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "../config/env.js";

/**
 * Single shared Prisma client. Prisma 7 connects through a driver
 * adapter (`@prisma/adapter-pg`); the URL comes from `env`. The
 * `globalThis` guard keeps `tsx watch` hot-reloads from opening a new
 * connection pool on every restart.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
