# セットアップ

## 前提

- Repository root で `docker compose up --build` を実行すると、Backend / PostgreSQL / Ollama が起動します。
- Backend コンテナは起動時に `prisma migrate deploy` を自動実行します（`npm start`）。マイグレーションの手動適用は不要です。
- **シードデータ（開発ユーザー + チーム）は自動投入されません。** 必要なら `docker compose exec backend npm run db:seed` を実行します。
- Frontend の Expo は Docker Compose では起動しません。`mobile/` で別プロセスとして起動します。

## Frontend 環境変数

`mobile/.env` に以下を設定します。

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Expo は起動時に `.env` を読むため、変更後は Expo を再起動してください。

## Backend 環境変数

`backend/.env.example` をコピーして `backend/.env` を作成します（`backend/src/config/env.ts` が zod で検証。`DATABASE_URL` は必須）。

```bash
cp backend/.env.example backend/.env
```

```env
DATABASE_URL=postgresql://teamnap:teamnap_dev@localhost:5432/teamnap
PORT=3000
HOST=0.0.0.0
DEV_USER_ID=00000000-0000-0000-0000-000000000001
```

- Docker Compose 経由で動かす場合、`compose.yaml` が `backend` サービスへ環境変数を渡すため `backend/.env` は主にローカル実行（`npm run dev`）で使います。Compose 内の DB ホストは `db`、ローカルからは `localhost` です。
- `DEV_USER_ID`（既定 `00000000-0000-0000-0000-000000000001`）は `X-User-Id` ヘッダ未指定時の呼び出しユーザーです。`npm run db:seed` が作る開発ユーザーと一致します。

## 起動手順（Docker Compose）

### 1. Backend / DB / Ollama を起動

Repository root で実行します。

```bash
docker compose up --build
```

Backend の確認:

```bash
curl http://localhost:3000/api/v1/health
```

### 2. 開発データを投入（任意）

```bash
docker compose exec backend npm run db:seed
```

開発ユーザー（`あなた` / `佐藤` ほか）とチーム `TEAM NAP 開発チーム`（招待コード `NAP-4821`）が作成されます。

### 3. Frontend を起動

`mobile/` で実行します。

```bash
npm start
```

## 起動手順（Backend をローカルで動かす場合）

DB だけ Compose で立て、Backend は `tsx` で直接動かす構成です。

```bash
docker compose up -d db          # PostgreSQL のみ起動
cd backend
npm install
npm run db:generate              # Prisma Client 生成
npm run db:migrate               # マイグレーション適用（prisma migrate dev）
npm run db:seed                  # 開発データ投入
npm run dev                      # tsx watch でサーバー起動
```

DB をまっさらに戻したいときは `npm run db:reset`（マイグレーション再適用 + シード）を使います。

## 起動成功時のログ

Frontend が正常に起動してアプリがマウントされると、Expo 側のターミナルに以下の形式で表示されます。

```text
[frontend] Frontend boot confirmed on ios at 2026-08-29T...
```

同時に Backend 側の Docker ログにも以下の形式で表示されます。

```text
[frontend-boot] Frontend booted successfully on ios at 2026-08-29T...
```

このログは Frontend から `POST /api/v1/health/frontend-boot` が成功したことを意味します。

## よくある原因

- `Invalid environment variables` で Backend が即終了する
  - `backend/.env` の `DATABASE_URL` が未設定です。上記の値を設定してください。
- Backend は起動するが DB 操作で `relation "Team" does not exist` などが出る
  - マイグレーション未適用です。Compose なら再起動で `migrate deploy` が走ります。ローカルなら `npm run db:migrate` を実行してください。
- チーム画面が空のまま / 招待コード `NAP-4821` で参加できない
  - シード未投入です。`npm run db:seed`（Compose なら `docker compose exec backend npm run db:seed`）を実行してください。
- `EXPO_PUBLIC_API_URL is not configured`
  - `mobile/.env` が未設定、または Expo を再起動していない可能性があります。
- Frontend の boot ログが Expo にだけ出て Docker に出ない
  - Backend が起動していない、または `EXPO_PUBLIC_API_URL` の値が誤っています。
