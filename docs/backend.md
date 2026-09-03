# Backend API

Team Nap の Express + TypeScript API サーバー（`backend/`）。全体像・レイヤリングは
[architecture.md](./architecture.md)、DB は [db.md](./db.md)、起動と環境変数は
[setup.md](./setup.md)。

## 永続化（Prisma 7 + PostgreSQL）

接続はドライバアダプタ `@prisma/adapter-pg` 経由（`src/lib/prisma.ts`）。
**すべてのモデルが Postgres に永続化されている**（`prisma/schema.prisma`）:

| モデル | 用途 |
| --- | --- |
| `User` / `Session` / `PasswordResetToken` | 認証・セッション・パスワード再設定 |
| `Onboarding` | 1 ユーザー 1 行。オンボーディング回答 ＋ 設定画面（睡眠 / 通知 / カレンダー連携状態）の保存先 |
| `NapRecord` | 仮眠 1 回 = 1 行。生成した `aiAdvice` 込み |
| `NapSession` | 進行中の仮眠（1 ユーザー最大 1 行）。teammate の「あと◯分」カード用 |
| `CalendarEvent` | ユーザーごとの予定。`source` = `manual` / `google` |
| `Notification` | 通知フィード（1 行 1 通知）。[notifications.md](./notifications.md) |
| `PushToken` | Expo プッシュトークン（デバイスごと）。[notifications.md](./notifications.md) |
| `Team` / `TeamMembership` | チームとメンバーシップ。[team-feature.md](./team-feature.md) |

インメモリで残っているのは realtime 在席ハブ（`src/realtime/hub.ts`、
プロセス内の WebSocket 接続集合）のみ。

## エンドポイント一覧

すべて `/api/v1` 配下。`/health` と `/auth/{signup,login,password-reset/*}` 以外は
`Authorization: Bearer <token>` 必須（`routes/index.ts` で一括 `authenticate`）。
バリデーションは各ルートの `validate({ body / params / query })`（zod、`schemas/`）。

| 機能 | 主なパス | 詳細 |
| --- | --- | --- |
| ヘルス | `GET /health`、`POST /health/frontend-boot` | — |
| 認証 | `POST /auth/{signup,login,logout,logout-others}`、`GET/PATCH/DELETE /auth/me`、`POST /auth/password`、`GET/DELETE /auth/sessions[/:id]`、`POST /auth/password-reset/{request,confirm}`、`GET /auth/debug`（dev のみ） | [auth.md](./auth.md) |
| オンボーディング | `GET/PUT /onboarding`、`POST /onboarding/complete` | [auth.md](./auth.md) |
| 設定 | `GET/POST /settings/{notifications,sleep-schedule,calendar}`、`POST /settings/calendar/google/{sync,disconnect}`、`POST /settings/calendar/device/connect`、`GET /settings/team`、`POST /settings/team/leave` | [settings-architecture.md](./settings-architecture.md) |
| ホーム | `GET /home/summary`、`GET /home/member-status` | — |
| スケジュール | `GET /schedule/day`、`POST/PUT/DELETE /schedule/events[/:id]` | — |
| 仮眠 | `GET /naps/history`、`GET /naps/:id`、`POST /naps` | [db.md](./db.md) |
| 休息判定 / ライブ仮眠 | `POST /rest/decision`、`PUT/DELETE /rest/session` | [team-feature.md](./team-feature.md) §6 |
| 統計 | `GET /stats` | — |
| チーム | `GET /teams/{summary,ranking,me/status}`、`POST /teams[/join]`、`PUT /teams[/me/status]`、`POST /teams/nap-suggestion`、`GET /teams/members/:id`、`POST /teams/members/:id/{wake,rest}`、`DELETE /teams/members/:id` | [team-feature.md](./team-feature.md) |
| 通知 | `GET /notifications`、`POST /notifications/read-all`、`POST /notifications/:id/read`、`POST/DELETE /notifications/token` | [notifications.md](./notifications.md) |
| AI | `POST /ai/personal-comment`、`POST /ai/team-comment` | [ai-development.md](./ai-development.md) |
| リアルタイム | `WS /api/v1/realtime?token=<bearer>` | [team-feature.md](./team-feature.md) §11 |

## リクエストの流れ

```text
route  (routes/*.ts)
  │  validate({ body?, params?, query? })   … zod。不正入力は 400（details 付き）
  ▼
controller  (controllers/*.ts)   … <動詞><名詞>Controller。HTTP 入出力のみ
  │  requireUserId(req) / requireSessionId(req)（lib/request-user.ts）
  ▼
service  (services/*.ts)   … ドメインロジック
  ▼
Prisma (lib/prisma.ts)  /  Ollama (services/ai.service.ts)
```

- **エラー**はどこからでも `HttpError` を throw（`HttpError.notFound()` /
  `.badRequest()` / `.conflict()` / `.badGateway()`）。`errorHandler` が
  適切なステータスで `{ error, details }` を返す。それ以外の例外は 500。
- **コントローラは再スロー目的の `try/catch` を書かない** — Express 5 が
  非同期エラーを自動転送する。
- `process.env` を読むのは `src/config/env.ts` だけ（zod 検証、不正なら起動時終了）。

## ディレクトリ構成

```text
src/
  server.ts        エントリポイント（ポートのバインドのみ）
  app.ts           Express アプリ（ミドルウェア + /api/v1 ルーターのマウント）
  config/env.ts    process.env を読む唯一の場所
  routes/          <feature>.routes.ts（+ index.ts で全ルーターをマウント）
  controllers/     <feature>.controller.ts（HTTP 入出力のみ）
  services/        <feature>.service.ts（ドメインロジック）
  schemas/         <feature>.schema.ts（zod リクエストスキーマ）
  middleware/      api-flow / authenticate / error / not-found / validate / request-logger
  lib/             prisma.ts, request-user.ts, password.ts, tokens.ts, api-flow.ts,
                   http-error.ts, params.ts, datetime.ts, rest-score.ts, sleep-window.ts
  realtime/hub.ts  WebSocket 在席ハブ
  types/           共有ドメイン型（domain.ts）+ express.d.ts（req.auth 拡張）
prisma/
  schema.prisma    モデル定義（11 モデル + enum MemberActivity）
  seed.ts          開発ユーザー + チーム + サンプルの NapRecord / CalendarEvent
  migrations/      Prisma Migrate 生成物（Git 管理、13 本）
prisma.config.ts   Prisma CLI 設定（schema / migrations / seed / datasource）
```

## スクリプト（`backend/` 内で実行）

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | `tsx` ウォッチ実行（`src/` を直接） |
| `npm run build` | 型チェック + `dist/` へ出力 |
| `npm start` | `prisma migrate deploy` 後に `dist/server.js`（Compose / 本番） |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `tsx --test` で `*.test.ts` |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev`（マイグレーション作成 + 適用） |
| `npm run db:seed` | `tsx prisma/seed.ts` |
| `npm run db:reset` | `prisma migrate reset`（DB 作り直し + シード） |
| `npm run db:studio` | `prisma studio` |

環境変数は [setup.md](./setup.md) と `backend/.env.example`。不正な env があると
サーバーは起動時にエラー内容を出力して終了する。

## エンドポイントの追加手順

1. `services/<feature>.service.ts` — ロジック本体。
2. `schemas/<feature>.schema.ts` — 入力を取るなら zod スキーマ。
3. `controllers/<feature>.controller.ts` — 薄いハンドラ。
4. `routes/<feature>.routes.ts` — `router.<method>(path, validate({...}), controller)`。
5. 新 feature なら `routes/index.ts` にルーターをマウント。
6. レスポンス型は Backend の `export type` と `mobile/src/types/api.ts` の両方に。

## スキーマ変更（DB）

1. `prisma/schema.prisma` を編集。
2. `npm run db:migrate -- --name <変更内容>` — マイグレーション作成 + 適用。
3. `prisma/migrations/` を commit。

Compose / 本番は `npm start` が `prisma migrate deploy` で自動適用。詳細は
[db.md](./db.md)。ブランチ切り替えで `Drift detected` が出たときは
[setup.md](./setup.md) のトラブルシュートを参照。

## デバッグ: API フロートレース

`DEBUG_API_FLOW=1` でリクエストごとのトレーサーが有効になる
（`src/lib/api-flow.ts` + `middleware/api-flow.middleware.ts`）。各リクエストで
通過レイヤーと所要時間を 1 ブロック出力する。

```text
API-flow 79c9b104  POST /api/v1/teams
  +0ms    [http] request in  body={"name":"Dev Team"}
  +0ms    [validate] ok  checked=body
  +1ms    [service] team.createTeam  name=Dev Team
  +2ms    [db] TeamMembership.count  ms=1
  +4ms    [db] Team.create  ms=6
  +12ms   [http] response out  status=201
API-flow 79c9b104  201 in 12ms  route=POST /api/v1/teams/  steps=6
```

- **自動**ステップ: `http`（in/out）、`validate`（ok/failed）、`db`（Prisma の
  全クエリ。`$extends` フック経由）、`error`（`errorHandler` から）。
- **手動**ステップ: `step("service", "team.joinTeam", { … })` や
  `await traced("service", "x", () => …)` を呼ぶと詳細を足せる。トレース OFF 時は
  no-op。`team.service.ts` に実例（`createTeam` / `joinTeam`）。
- `DEBUG_API_FLOW_SCOPE=/teams` で URL 部分一致フィルタ。`requestLogger`
  （`METHOD url status ms` の 1 行ログ）は別ミドルウェアで常時動く（`test` を除く）。

## ヘルスチェック

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","service":"team-nap-api","timestamp":"..."}
```
