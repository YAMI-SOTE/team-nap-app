# Team Nap API（バックエンド）

Team Nap アプリ向けの Express + TypeScript 製 API サーバーです。

> English version: [README.md](./README.md)

> データ層は現在すべてインメモリのモック状態です（`src/services/*` を参照）。
> Prisma / PostgreSQL への接続は別タスクで、`prisma/schema.prisma` と
> `src/config/env.ts` の `DATABASE_URL` はそのためのプレースホルダーです。

## スクリプト

| コマンド             | 内容                                       |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | `tsx` によるウォッチ実行（`src/` を直接実行） |
| `npm run build`     | 型チェック + `dist/` へ出力                  |
| `npm start`         | ビルド済みサーバーを実行（`dist/server.js`）  |
| `npm run typecheck` | `tsc --noEmit`                             |
| `npm test`          | Node 標準テストランナーで `*.test.ts` を実行 |

## 環境変数

`src/config/env.ts` で一度だけ読み込み・検証します。`.env` を用意して調整してください。

| 変数            | デフォルト                | 備考                              |
| -------------- | ------------------------ | -------------------------------- |
| `NODE_ENV`     | `development`            | `development \| production \| test` |
| `PORT`         | `3000`                   |                                 |
| `HOST`         | `0.0.0.0`                |                                 |
| `OLLAMA_URL`   | `http://localhost:11434` | AI コメント生成用                  |
| `OLLAMA_MODEL` | `gemma4:e2b`             | ⚠️ タグが正しいか要確認            |
| `DATABASE_URL` | _(空)_                   | Prisma 用（未使用）                |

不正な環境変数がある場合、サーバーは起動時にエラー内容を出力して終了します。

## ディレクトリ構成

```
src/
  server.ts            エントリポイント（ポートをバインドするだけ）
  app.ts               Express アプリ本体（ミドルウェア + ルーターのマウント）
  config/
    env.ts             process.env を読むのはここだけ
  routes/              <feature>.routes.ts — パス + validate() + コントローラの接続
    index.ts           全 feature ルーターを /api/v1 にまとめてマウント
  controllers/         <feature>.controller.ts — HTTP の入出力のみ。ロジックは持たない
  services/            <feature>.service.ts — （モックの）データとドメインロジック
  schemas/             <feature>.schema.ts — zod のリクエストスキーマ
  middleware/          *.middleware.ts — エラーハンドラ / 404 / validate / リクエストログ
  lib/                 フレームワーク非依存のヘルパー（http-error, params, datetime）
  types/               共有ドメイン型（domain.ts）
```

### リクエストの流れ

`route` → `validate({ body?, params?, query? })` → `controller` → `service`

- **バリデーション**はルートの `validate()` で行います。コントローラは
  `req.body` / `req.params` をそのまま信頼して構いません。不正な入力は
  `400`（`details` に内訳）になります。
- **エラー**はどこからでも `HttpError` を throw します
  （`HttpError.notFound()` / `.badRequest()` / `.badGateway()`）。
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
