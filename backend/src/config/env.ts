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

  // AI comment generation (Ollama). Default `gemma4:e2b` (~7.2GB) for the
  // best Japanese wording. It needs ~8GB RAM / 2 CPU and generates in
  // ~24s warm (cold model load can be ~45-60s), so OLLAMA_TIMEOUT_MS is
  // set accordingly. On a smaller box set OLLAMA_MODEL=gemma3:1b (~815MB,
  // ~5-16s, fits 4GB/1CPU). Any pullable tag works; if generation can't
  // keep up everything falls back to the rule-based / canned copy.
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().min(1).default("gemma4:e2b"),
  // Abort a single generation after this long, then fall back to
  // rule-based / canned copy. `gemma4:e2b` needs ~24s warm and longer for
  // the first (cold) request, so keep this generous.
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),

  // Expo push. `EXPO_PUSH_URL` almost never changes. `EXPO_ACCESS_TOKEN`
  // is optional — set it (from expo.dev → Account → Access tokens) to
  // send with "Enhanced Security for Push Notifications" turned on;
  // without it, unauthenticated sends still work.
  EXPO_PUSH_URL: z
    .string()
    .url()
    .default("https://exp.host/--/api/v2/push/send"),
  EXPO_ACCESS_TOKEN: z.string().min(1).optional(),

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

  // --- Google OAuth + Calendar --------------------------------------------
  // All optional. The whole feature stays dormant (Google login rejected
  // with a clear message, calendar sync falls back to the sample set)
  // until at least CLIENT_ID + TOKEN_ENC_KEY are set. See
  // docs/google-integration.md.
  //
  // The Web OAuth client (has a secret, server-only). Also the default
  // `aud` for id_token verification.
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  // Native client ids (public, no secret — PKCE protects the exchange).
  GOOGLE_OAUTH_IOS_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_OAUTH_ANDROID_CLIENT_ID: z.string().min(1).optional(),
  // Comma / whitespace separated allow-list of redirect URIs the client
  // may present to POST /auth/google.
  GOOGLE_OAUTH_REDIRECT_URIS: z.string().default(""),
  // 32-byte key for AES-256-GCM token encryption, as base64 or hex.
  // Read directly from process.env by src/lib/secret-box.ts; declared
  // here only so it is documented + validated on boot.
  GOOGLE_TOKEN_ENC_KEY: z.string().min(1).optional(),
  // Space-separated OAuth scopes requested. Calendar read is the minimum
  // that still lets the free-slot logic see real events.
  GOOGLE_OAUTH_SCOPES: z
    .string()
    .default(
      "openid email profile https://www.googleapis.com/auth/calendar.events.readonly",
    ),
  // Public https origin of THIS API, used as the events.watch callback
  // base. Push-channel registration is skipped when unset.
  PUBLIC_BASE_URL: z.string().url().optional(),
  // Shared secret Google echoes back in the X-Goog-Channel-Token header
  // of every webhook call; the endpoint drops calls that don't match.
  GOOGLE_WEBHOOK_TOKEN: z.string().min(1).optional(),
  // Background incremental-sync cadence in minutes (0 disables the job).
  GOOGLE_CALENDAR_SYNC_MINUTES: z.coerce.number().int().min(0).default(15),
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
