# Team Nap API（バックエンド）

Team Nap アプリ向けの Express + TypeScript 製 API サーバーです。

> English version: [README.md](./README.md)

## データ永続化

Prisma 7 + PostgreSQL。接続はドライバアダプタ `@prisma/adapter-pg` 経由で
行います（`src/lib/prisma.ts`）。永続化しているモデルは
**`User` / `Team` / `TeamMembership`** です
（`prisma/schema.prisma`、詳細は [../docs/db.md](../docs/db.md)）。

チーム関連のサービスは DB 化済みです（`team.service` / `member.service` /
`nudge.service` と `home.service` のメンバーステータス部分）。
それ以外（`settings` / `schedule` / `notifications` / `naps`、および
今週の Team Nap サマリー・ランキングのスナップショット）は、まだ
`src/services/*` のインメモリ状態です。

認証はまだありません。呼び出しユーザーは `X-User-Id` ヘッダ、無ければ
`env.DEV_USER_ID` です（`src/lib/request-user.ts`）。

## スクリプト

| コマンド              | 内容                                                  |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | `tsx` によるウォッチ実行（`src/` を直接実行）             |
| `npm run build`      | 型チェック + `dist/` へ出力                             |
| `npm start`          | `prisma migrate deploy` 後に `dist/server.js` を実行   |
| `npm run typecheck`  | `tsc --noEmit`                                       |
| `npm test`           | `tsx --test` で `*.test.ts` を実行                     |
| `npm run db:generate`| `prisma generate`（Prisma Client 生成）               |
| `npm run db:migrate` | `prisma migrate dev`（マイグレーション作成 + 適用）      |
| `npm run db:seed`    | `tsx prisma/seed.ts`（開発ユーザー + チーム `NAP-4821`）|
| `npm run db:reset`   | `prisma migrate reset`（DB 作り直し + シード）          |
| `npm run db:studio`  | `prisma studio`                                      |

## 環境変数

`src/config/env.ts` で一度だけ読み込み・検証します（zod）。
`.env.example` を `backend/.env` にコピーして設定します。
`prisma.config.ts` も `dotenv/config` で読み込みます。

| 変数            | 必須 | デフォルト                              | 備考                              |
| -------------- | ---- | ------------------------------------ | -------------------------------- |
| `DATABASE_URL` | ✅   | –                                   | Prisma 接続文字列。Compose 内は host が `db`、ローカルは `localhost` |
| `DEV_USER_ID`  |      | `00000000-0000-0000-0000-000000000001` | `X-User-Id` 未指定時の呼び出しユーザー。`prisma/seed.ts` と一致 |
| `NODE_ENV`     |      | `development`                        | `development \| production \| test` |
| `PORT`         |      | `3000`                              |                                 |
| `HOST`         |      | `0.0.0.0`                           |                                 |
| `OLLAMA_URL`   |      | `http://localhost:11434`            | AI コメント生成用                  |
| `OLLAMA_MODEL` |      | `gemma4:e2b`                        | ⚠️ タグが正しいか要確認            |

不正な環境変数がある場合、サーバーは起動時にエラー内容を出力して終了します。

## ディレクトリ構成

```
src/
  server.ts            エントリポイント（ポートをバインドするだけ）
  app.ts               Express アプリ本体（ミドルウェア + ルーターを /api/v1 にマウント）
  config/
    env.ts             process.env を読むのはここだけ
  routes/              <feature>.routes.ts — パス + validate() + コントローラの接続
    index.ts           全 feature ルーターを /api/v1 にまとめてマウント
  controllers/         <feature>.controller.ts — HTTP の入出力のみ。ロジックは持たない
  services/            <feature>.service.ts — ドメインロジック（DB化済み or インメモリ）
  schemas/             <feature>.schema.ts — zod のリクエストスキーマ
  middleware/          *.middleware.ts — エラーハンドラ / 404 / validate / リクエストログ
  lib/
    prisma.ts          共有 Prisma Client（driver adapter で初期化）
    request-user.ts    currentUserId(req) — X-User-Id ヘッダ or DEV_USER_ID
    http-error.ts, params.ts, datetime.ts
  types/               共有ドメイン型（domain.ts）
prisma/
  schema.prisma        User / Team / TeamMembership + MemberActivity enum
  seed.ts              開発ユーザー + "TEAM NAP 開発チーム"（NAP-4821）
  migrations/          Prisma Migrate の生成物（Git 管理）
prisma.config.ts       Prisma CLI 設定（schema / migrations / seed / datasource）
```

### リクエストの流れ

`route` → `validate({ body?, params?, query? })` → `controller` → `service`

- **バリデーション**はルートの `validate()` で行います。コントローラは
  `req.body` / `req.params` をそのまま信頼して構いません。不正な入力は
  `400`（`details` に内訳）になります。
- **エラー**はどこからでも `HttpError` を throw します
  （`HttpError.notFound()` / `.badRequest()` / `.conflict()` / `.badGateway()`）。
  `errorHandler` が適切なステータスで `{ error }` を返し、それ以外の
  例外はログ出力のうえ汎用の `500` になります。
- **コントローラ**は `<動詞><名詞>Controller` の命名で統一します。
  再スロー目的だけの `try/catch` は書きません
  （Express 5 が非同期エラーを自動で転送します）。

## エンドポイントの追加手順

1. `services/<feature>.service.ts` — ロジック本体。
2. `schemas/<feature>.schema.ts` — 入力を取るなら zod スキーマ。
3. `controllers/<feature>.controller.ts` — 薄いハンドラ。
4. `routes/<feature>.routes.ts` — `router.<method>(path, validate({...}), controller)`。
5. 新 feature の場合は `routes/index.ts` にルーターをマウント。

## スキーマ変更（DB）

1. `prisma/schema.prisma` を編集。
2. `npm run db:migrate -- --name <変更内容>` — マイグレーション作成 + 適用。
3. `prisma/migrations/` を commit。

Compose / 本番ではマイグレーションが自動適用されます（`npm start` が
`prisma migrate deploy` を実行）。詳細は [../docs/db.md](../docs/db.md)。

チーム機能のバックエンド設計は
[../docs/team-feature.ja.md](../docs/team-feature.ja.md) にまとめています。

## ヘルスチェック

```bash
curl http://localhost:3000/api/v1/health
```

正常時:

```json
{
  "status": "ok",
  "service": "team-nap-api",
  "timestamp": "2026-08-30T06:10:41.398Z"
}
```
