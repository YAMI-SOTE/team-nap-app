# セットアップ

> 機能を手で確認する手順は [testing-guide.md](./testing-guide.md)、
> テスト用アカウント / スケジュールは [test-account.md](./test-account.md)。

## 最短セットアップ

いちばん簡単な起動手順はこれです。

### 1. Repository root で Backend / DB / Ollama を起動

```bash
docker compose up --build
```

初回はイメージ build と Ollama モデル取得があるため少し時間がかかります。

### 2. 別ターミナルで Frontend を起動

```bash
cd mobile
npm install
npx expo start
```

`mobile/.env` は以下を使います。

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### 3. 必要なら開発データを投入

別ターミナルで Repository root に戻って実行します。

```bash
docker compose exec backend npm run db:seed
```

これで開発ユーザーとチーム `TEAM NAP 開発チーム`（招待コード `NAP-4821`）が入ります。

### 4. 動作確認

Backend:

```bash
curl http://localhost:3000/api/v1/health
```

Frontend:

- Expo ターミナルが起動し、QR code / iOS / Android / web の選択肢が表示されればOKです。
- アプリ起動後、Expo 側に `[frontend] Frontend boot confirmed ...` が出て、Backend 側に `[frontend-boot] ...` が出れば疎通できています。

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
- `DEV_USER_ID`（既定 `00000000-0000-0000-0000-000000000001`）は旧 `X-User-Id` フォールバック用です。現在は `/health` `/auth` 以外の全ルートが `authenticate`（Bearer トークン）必須なので実質未使用ですが、`npm run db:seed` が作る開発ユーザー id と一致させてあります。

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
npm install
npx expo start
```

依存関係インストール済みなら `npx expo start` だけで構いません。

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

## リアルタイム在席（WebSocket）

Backend は同じポートで WebSocket も待ち受けます:
`ws://localhost:3000/api/v1/realtime?token=<セッショントークン>`。
`EXPO_PUBLIC_API_URL` の `http`→`ws` 置換で自動的に導出されるので、
モバイル側の追加設定は不要です。チームのメンバーが在席ステータスを
変えると、接続中の全メンバーへ `member-status` が push されます。
実機で試す場合は `EXPO_PUBLIC_API_URL` が PC の LAN IP を指していれば
そのまま WS も通ります（同一ポート）。

## API リクエストが必ず失敗する（最優先チェック）

1. **Backend が起動しているか**

   ```bash
   curl http://localhost:3000/api/v1/health      # {"status":"ok",...} が返るはず
   docker compose ps                              # backend の STATUS が Up か
   docker compose logs -f backend                 # 起動失敗の理由を確認
   ```

   - `docker compose ps` に `backend` が無い/落ちている場合、以前は
     `ollama-pull` の完了待ちで起動しないことがありました。現在は
     `backend` は **`db` の healthy だけ**を待ちます（`compose.yaml`）。
     古い挙動なら `docker compose up -d --build backend` で単体起動できます。
   - ローカルで `npm start` する場合は先に `npm run build` が必要です
     （`dist/` が無いと `node dist/server.js` が失敗）。`npm run dev` なら不要。

2. **モバイルの向き先（`EXPO_PUBLIC_API_URL`）が実機/エミュレータで合っているか**

   | 実行環境 | `mobile/.env` の値 |
   | --- | --- |
   | iOS シミュレータ / Web | `http://localhost:3000/api/v1` |
   | Android エミュレータ | `http://10.0.2.2:3000/api/v1` |
   | 実機（同じ Wi-Fi） | `http://<PCのLAN IP>:3000/api/v1`（例 `http://192.168.1.23:3000/api/v1`） |

   変更後は Expo を再起動（`.env` は起動時のみ読み込み）。

3. **認証が要るエンドポイントで 401 が返る**
   - `/api/v1/{teams,notifications,onboarding}/*` と `/settings/team*` は
     `Authorization: Bearer <token>` 必須。モバイルはログイン後
     `AuthContext` がトークンを付与します（未ログインだと 401）。

## その他よくある原因

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
