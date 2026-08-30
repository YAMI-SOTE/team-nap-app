# Team Nap API

Express + TypeScript API server for the Team Nap app.

> 日本語版: [README.ja.md](./README.ja.md)

> The data layer is still in-memory mock state (see `src/services/*`).
> Prisma/Postgres wiring is a separate task — `prisma/schema.prisma` and
> `src/config/env.ts` (`DATABASE_URL`) are placeholders for it.

## Scripts

| Command             | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Watch-mode server via `tsx` (`src/`)      |
| `npm run build`     | Type-check + emit to `dist/`              |
| `npm start`         | Run the built server (`dist/server.js`)   |
| `npm run typecheck` | `tsc --noEmit`                            |
| `npm test`          | Run `*.test.ts` with the Node test runner |

## Environment

Read and validated once in `src/config/env.ts`. Copy `.env` and adjust.

| Var            | Default                  | Notes                          |
| -------------- | ------------------------ | ------------------------------ |
| `NODE_ENV`     | `development`            | `development \| production \| test` |
| `PORT`         | `3000`                   |                                |
| `HOST`         | `0.0.0.0`                |                                |
| `OLLAMA_URL`   | `http://localhost:11434` | AI comment generation          |
| `OLLAMA_MODEL` | `gemma4:e2b`             | ⚠️ verify this tag             |
| `DATABASE_URL` | _(empty)_                | reserved for Prisma            |

## Layout

```
src/
  server.ts            entrypoint — binds the port
  app.ts               express app: middleware + router mount
  config/
    env.ts             the only reader of process.env
  routes/              <feature>.routes.ts — paths + validate() + controller wiring
    index.ts           mounts every feature router under /api/v1
  controllers/         <feature>.controller.ts — HTTP in/out only, no business logic
  services/            <feature>.service.ts — the (mock) data + domain logic
  schemas/             <feature>.schema.ts — zod request schemas
  middleware/          *.middleware.ts — error handler, 404, validate, request log
  lib/                 framework-agnostic helpers (http-error, params, datetime)
  types/               shared domain types (domain.ts)
```

### Request flow

`route` → `validate({ body?, params?, query? })` → `controller` → `service`

- **Validation** happens in the route via `validate()`. Controllers can
  trust `req.body` / `req.params`. Invalid input → `400` with `details`.
- **Errors**: throw `HttpError` (`HttpError.notFound()`, `.badRequest()`,
  `.badGateway()`) from anywhere. `errorHandler` renders `{ error }` with
  the right status; anything else becomes a generic `500`.
- **Controllers** are named `<verb><Noun>Controller` and never `try/catch`
  just to re-throw — Express 5 forwards async errors automatically.

## Adding an endpoint

1. `services/<feature>.service.ts` — the logic.
2. `schemas/<feature>.schema.ts` — zod schema(s) if it takes input.
3. `controllers/<feature>.controller.ts` — thin handler.
4. `routes/<feature>.routes.ts` — `router.<method>(path, validate({...}), controller)`.
5. Mount the router in `routes/index.ts` (new feature only).

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
