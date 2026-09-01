import "dotenv/config";

import { z } from "zod";

/**
 * The single place `process.env` is read. Every other module imports the
 * typed, validated `env` object from here instead of touching
 * `process.env` directly.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().min(1).default("0.0.0.0"),

  // AI comment generation (Ollama).
  // NOTE: verify the model tag — "gemma4:e2b" looks like a typo.
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().min(1).default("gemma4:e2b"),

  // Postgres connection string for Prisma.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Caller identity fallback for routes that are not behind `authenticate`
  // and receive no `X-User-Id` header. Matches `prisma/seed.ts`.
  DEV_USER_ID: z
    .string()
    .min(1)
    .default("00000000-0000-0000-0000-000000000001"),

  // Lifetime of an issued session token, in hours (default 30 days).
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(720),

  // Lifetime of a password-reset token, in minutes (default 1 hour).
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),

  // API-flow debug tracer (src/lib/api-flow.ts). Off by default; set to
  // "1" or "true" to log a per-request layer-by-layer trace.
  DEBUG_API_FLOW: z
    .string()
    .default("false")
    .transform((v) => v === "1" || v.toLowerCase() === "true"),
  // Optional substring filter for the tracer, e.g. "/teams" to trace only
  // team routes. Empty = trace every route.
  DEBUG_API_FLOW_SCOPE: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:\n" + z.prettifyError(parsed.error),
  );
  process.exit(1);
}

export const env = parsed.data;

export type Env = typeof env;
