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

  // Reserved for the upcoming Prisma/Postgres work; empty until then.
  DATABASE_URL: z.string().default(""),
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
