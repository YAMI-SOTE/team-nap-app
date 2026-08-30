import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "../config/env.js";
import { step } from "./api-flow.js";

/**
 * Single shared Prisma client. Prisma 7 connects through a driver
 * adapter (`@prisma/adapter-pg`); the URL comes from `env`. The
 * `globalThis` guard keeps `tsx watch` hot-reloads from opening a new
 * connection pool on every restart.
 *
 * The `$extends` hook feeds every query into the API-flow tracer
 * (`lib/api-flow.ts`) as a `db` step — a no-op when tracing is off.
 */
function createClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter }).$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        const start = Date.now();
        try {
          return await query(args);
        } finally {
          step("db", `${model ?? "raw"}.${operation}`, {
            ms: Date.now() - start,
          });
        }
      },
    },
  });
}

type Client = ReturnType<typeof createClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: Client;
};

export const prisma: Client = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
