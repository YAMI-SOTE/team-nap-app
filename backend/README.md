# Team Nap API

Express + TypeScript API server for the Team Nap app.

> 日本語版: [README.ja.md](./README.ja.md)

## Persistence

Prisma 7 + PostgreSQL, connected through the `@prisma/adapter-pg` driver
adapter (`src/lib/prisma.ts`). Persisted models: **`User`, `Team`,
`TeamMembership`** (see `prisma/schema.prisma` and
[../docs/db.md](../docs/db.md)).

Team-related services are DB-backed: `team.service`, `member.service`,
`nudge.service`, and the member-status part of `home.service`. The rest
(`settings`, `schedule`, `notifications`, `naps`, and the team
summary/ranking snapshots) is still in-memory state in `src/services/*`.

There is no auth yet — the acting user is the `X-User-Id` header, or
`env.DEV_USER_ID` when it is absent (`src/lib/request-user.ts`).

## Scripts

| Command              | What it does                                        |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Watch-mode server via `tsx` (`src/`)               |
| `npm run build`      | Type-check + emit to `dist/`                       |
| `npm start`          | `prisma migrate deploy` then run `dist/server.js`  |
| `npm run typecheck`  | `tsc --noEmit`                                     |
| `npm test`           | Run `*.test.ts` with `tsx --test`                  |
| `npm run db:generate`| `prisma generate`                                  |
| `npm run db:migrate` | `prisma migrate dev` (create + apply a migration)  |
| `npm run db:seed`    | `tsx prisma/seed.ts` (dev users + team `NAP-4821`) |
| `npm run db:reset`   | `prisma migrate reset` (drop, re-migrate, re-seed) |
| `npm run db:studio`  | `prisma studio`                                    |

## Environment

Read and validated once in `src/config/env.ts` (zod). Copy
`.env.example` to `backend/.env`; `prisma.config.ts` also loads it via
`dotenv/config`.

| Var            | Required | Default                  | Notes                          |
| -------------- | -------- | ------------------------ | ------------------------------ |
| `DATABASE_URL` | yes      | –                        | Prisma connection string. Host is `db` inside Compose, `localhost` locally |
| `DEV_USER_ID`  |          | `00000000-0000-0000-0000-000000000001` | Caller identity when `X-User-Id` is missing; matches `prisma/seed.ts` |
| `NODE_ENV`     |          | `development`            | `development \| production \| test` |
| `PORT`         |          | `3000`                   |                                |
| `HOST`         |          | `0.0.0.0`                |                                |
| `OLLAMA_URL`   |          | `http://localhost:11434` | AI comment generation          |
| `OLLAMA_MODEL` |          | `gemma4:e2b`             | ⚠️ verify this tag             |
| `DEBUG_API_FLOW` |        | `false`                 | `1`/`true` → per-request API-flow trace (see below) |
| `DEBUG_API_FLOW_SCOPE` |  | –                       | substring filter, e.g. `/teams` |

Invalid env → the server prints the problem and exits on startup.

## Layout

```
src/
  server.ts            entrypoint — binds the port
  app.ts               express app: middleware + router mount (/api/v1)
  config/
    env.ts             the only reader of process.env
  routes/              <feature>.routes.ts — paths + validate() + controller wiring
    index.ts           mounts every feature router under /api/v1
  controllers/         <feature>.controller.ts — HTTP in/out only, no business logic
  services/            <feature>.service.ts — domain logic (DB-backed or in-memory)
  schemas/             <feature>.schema.ts — zod request schemas
  middleware/          *.middleware.ts — api-flow, error handler, 404, validate, request log
  lib/
    prisma.ts          shared Prisma client (driver adapter) + api-flow db hook
    request-user.ts    currentUserId(req) — X-User-Id header or DEV_USER_ID
    api-flow.ts        per-request flow tracer (step / traced / render)
    http-error.ts, params.ts, datetime.ts
  types/               shared domain types (domain.ts)
prisma/
  schema.prisma        User / Team / TeamMembership + MemberActivity enum
  seed.ts              dev users + "TEAM NAP 開発チーム" (NAP-4821)
  migrations/          Prisma Migrate output (committed)
prisma.config.ts       Prisma CLI config (schema / migrations / seed / datasource)
```

### Request flow

`route` → `validate({ body?, params?, query? })` → `controller` → `service`

- **Validation** happens in the route via `validate()`. Controllers can
  trust `req.body` / `req.params`. Invalid input → `400` with `details`.
- **Errors**: throw `HttpError` (`HttpError.notFound()`, `.badRequest()`,
  `.conflict()`, `.badGateway()`) from anywhere. `errorHandler` renders
  `{ error }` with the right status; anything else becomes a generic `500`.
- **Controllers** are named `<verb><Noun>Controller` and never `try/catch`
  just to re-throw — Express 5 forwards async errors automatically.

## Adding an endpoint

1. `services/<feature>.service.ts` — the logic.
2. `schemas/<feature>.schema.ts` — zod schema(s) if it takes input.
3. `controllers/<feature>.controller.ts` — thin handler.
4. `routes/<feature>.routes.ts` — `router.<method>(path, validate({...}), controller)`.
5. Mount the router in `routes/index.ts` (new feature only).

## Debugging: API flow trace

`DEBUG_API_FLOW=1` turns on a per-request tracer (`src/lib/api-flow.ts` +
`middleware/api-flow.middleware.ts`). For every request it prints one
block showing the layers it passed through and where the time went:

```
API-flow 79c9b104  POST /api/v1/teams
  +0ms    [http] request in  body={"name":"Dev Team"}
  +0ms    [validate] ok  checked=body
  +1ms    [service] team.createTeam  name=Dev Team
  +2ms    [db] TeamMembership.count  ms=1
  +4ms    [db] Team.create  ms=6
  +12ms   [http] response out  status=201
API-flow 79c9b104  201 in 12ms  route=POST /api/v1/teams/  steps=6
```

- **Automatic** steps: `http` (in/out), `validate` (ok/failed), `db`
  (every Prisma query, via a `$extends` hook), `error` (from
  `errorHandler`), plus the matched `route` in the footer.
- **Manual** steps: call `step("service", "team.joinTeam", { … })` or
  `await traced("service", "x", () => …)` from a controller/service to add
  detail. Both are no-ops when tracing is off. `team.service.ts` has two
  worked examples (`createTeam`, `joinTeam`).

### Separating the views

The block is one request; each line is tagged with its layer. To look at
one layer or one feature in isolation:

| Want | How |
| --- | --- |
| Only team routes | `DEBUG_API_FLOW_SCOPE=/teams` (substring match on the URL) |
| Only the DB layer | `... | grep '\[db\]'` |
| Only failed requests | `... | grep -E 'steps=|(\[error\])'` |
| A single request end-to-end | `grep <id>` — the 8-char id is on every line of its block |
| Keep the terse one-liner too | `requestLogger` still logs `METHOD url status ms` independently |

`requestLogger` and `apiFlowLogger` are separate middleware — the terse
log always runs (except under `NODE_ENV=test`); the flow trace only runs
when `DEBUG_API_FLOW` is set.

## Database changes

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate -- --name <change>` — creates + applies the migration.
3. Commit `prisma/migrations/`.

Compose / production apply migrations automatically (`npm start` runs
`prisma migrate deploy`). See [../docs/db.md](../docs/db.md).

The team feature's backend design is documented in
[../docs/team-feature.ja.md](../docs/team-feature.ja.md).

## Health check

```bash
curl http://localhost:3000/api/v1/health
```

```json
{
  "status": "ok",
  "service": "team-nap-api",
  "timestamp": "2026-08-30T06:10:41.398Z"
}
```
