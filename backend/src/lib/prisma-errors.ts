import { Prisma } from "@prisma/client";

/**
 * True when `err` is a Prisma unique-constraint violation (`P2002`) —
 * e.g. two racing requests both trying to create the row that
 * `@@unique` forbids. Callers turn this into a 409 instead of a 500.
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}
