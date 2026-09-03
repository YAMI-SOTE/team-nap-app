# セットアップ

環境構築と起動手順。前提の共通ルールは [README.md](./README.md)、トラブルは
このページ末尾の「[その他よくある原因](#その他よくある原因)」、VPS への配置は
「[本番デプロイ（VPS）](#本番デプロイvps)」。

## クイックスタート（Docker Compose）

Repository root で:

```bash
docker compose up --build          # backend / db / ollama / ollama-pull
```

- `backend` コンテナは起動時に `prisma migrate deploy` を自動実行する
  （マイグレーションの手動適用は不要）。
- **シードは自動投入されない。** 必要なら:
  `docker compose exec backend npm run db:seed`
  （テストアカウント + チーム。一覧は [test-account.md](./test-account.md)）。
- Frontend の Expo は Compose では起動しない。別プロセスで:

```bash
cd mobile && npm install && npx expo start
```

動作確認: `curl http://localhost:3000/api/v1/health` → `{"status":"ok",...}`。
アプリ起動後、Expo 側に `[frontend] Frontend boot confirmed ...`、Backend 側に
`[frontend-boot] ...` が出れば疎通できている（`POST /api/v1/health/frontend-boot`）。

## ローカルで Backend を動かす

DB（と AI を使うなら Ollama）だけ Compose で立て、Backend は `tsx` で直接動かす。

> **`npm` 系コマンドは必ず `backend/` の中で実行する。** ルートに
> `package.json` は無いので、root で `npm install && npm run db:migrate` すると
> `ENOENT ... package.json` / `Missing script` で失敗する（`mobile/` も別途）。

```bash
docker compose up -d db ollama    # backend コンテナは起動しない（ポート 3000 の取り合いを避ける）
cd backend
npm install
npm run db:generate              # Prisma Client 生成
npm run db:migrate               # マイグレーション適用（prisma migrate dev）
npm run db:seed                  # 開発データ投入
npm run dev                      # tsx watch（PORT=3000 / HOST=0.0.0.0）
```

- `docker compose up`（引数なし）は `backend` コンテナも起動し、ローカルの
  `npm run dev` とポート 3000 を取り合って `EADDRINUSE` になる。サービスを
  指定して起動すること。
- DB を作り直すなら `npm run db:reset`（マイグレーション再適用 + シード）。
- ブランチ切り替えで `npm run db:migrate` が「Drift detected」で止まるときは
  「その他よくある原因」を参照。

## 環境変数

`backend/.env` と `mobile/.env` を、それぞれの `.env.example` から作る
（**ルートに `.env` は置かない**。VPS 運用時のみ compose 変数展開用の
`./.env` を使う → 「本番デプロイ（VPS）」）。

### Backend（`backend/.env`）

`backend/src/config/env.ts` が zod で検証する（`DATABASE_URL` 必須。不正なら
起動時に終了）。全変数は `backend/.env.example` を参照。要点:

```env
DATABASE_URL=postgresql://teamnap:teamnap_dev@localhost:5432/teamnap
# Compose 内では host が db:
#   postgresql://teamnap:teamnap_dev@db:5432/teamnap
PORT=3000
HOST=0.0.0.0
OLLAMA_URL=http://localhost:11434      # Compose 内では http://ollama:11434
OLLAMA_MODEL=gemma4:e2b               # 既定。日本語重視（~8GB/2CPU）。軽量なら gemma3:1b
OLLAMA_TIMEOUT_MS=60000               # 1 生成のタイムアウト。超えたら定型文へフォールバック
```

Compose 経由では `compose.yaml` が `backend` サービスへ env を渡すため、
`backend/.env` は主にローカル `npm run dev` 用。

### Frontend（`mobile/.env`）

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

| 実行環境 | 値 |
| --- | --- |
| iOS シミュレータ / Web | `http://localhost:3000/api/v1` |
| Android エミュレータ | `http://10.0.2.2:3000/api/v1` |
| 実機（同じ Wi-Fi） | `http://<PCのLAN IP>:3000/api/v1` |
| 実機（Tailscale） | `http://<PCのTailscale IP>:3000/api/v1` |

`EXPO_PUBLIC_*` はビルド時にバンドルへ埋め込まれる。`.env` を変えたら
**`npx expo start -c`（キャッシュクリア再起動）**。アプリのリロード（`r`）だけ
では反映されない。WebSocket 在席（`/api/v1/realtime`）は `http`→`ws` 置換で
自動導出されるので追加設定は不要。

## 本番デプロイ（VPS）

ローカルと同じ `compose.yaml` をそのまま使います。VPS 側の実装ガイドラインを
以下にまとめます。

### 前提（マシン要件）

| 項目 | 目安 |
| --- | --- |
| OS | Docker Engine + Docker Compose v2 が動く Linux |
| CPU / RAM | Backend + Postgres だけなら 1 vCPU / 1GB でも可 |
| AI（Ollama）を実際に生成させる場合 | 既定モデル `gemma4:e2b` は **ollama サービスに ~8GB RAM / 2 CPU**。足りないと `llama-server` が OOM kill され AI はフォールバックに落ちる（API は落ちない）。小さい VPS では `OLLAMA_MODEL=gemma3:1b`（~815MB / 4GB・1CPU 可） |
| ディスク | Postgres データ + Ollama モデル（gemma4:e2b で ~7.2GB、gemma3:1b で ~815MB）。10GB は空けておく |
| 公開ポート | リバースプロキシ経由なら 80/443 のみ。3000 は外部に晒さない |

### 1. 取得と環境設定

```bash
git clone <repo> team-nap-app && cd team-nap-app
```

`compose.yaml` は環境変数を `${VAR:-default}` で埋め込みます。Compose は
**Repository root の `.env` を自動で読んで**変数展開に使うので、本番値は
root に `.env` を新規作成して置きます（`.gitignore` 済み。`backend/.env` とは別物）。

```env
# ./.env  (compose が変数展開に使う)
NODE_ENV=production
OLLAMA_MODEL=gemma4:e2b          # RAM が足りなければ gemma3:1b
OLLAMA_TIMEOUT_MS=60000
```

- `NODE_ENV=production` で開発用ヘルパ（パスワードリセットトークンをレスポンスに
  含める、`GET /auth/debug`）が無効になります。**本番では必須。**
- **DB パスワード**: `compose.yaml` は現状 `teamnap_dev` をハードコードしています
  （`db` サービスの `POSTGRES_PASSWORD` と `backend` の `DATABASE_URL` の両方）。
  本番では両方を同じ強いパスワードに書き換えるか、`compose.override.yaml` で
  上書きします。`db` を外部に publish しない（`ports:` を消す）のも推奨。
- `backend/.env` は Compose 運用では読まれません（ローカル `npm run dev` 専用）。

### 2. 起動

```bash
docker compose up -d --build
```

- `backend` コンテナは起動時に `prisma migrate deploy` を自動実行します
  （`npm start` = `prisma migrate deploy && node dist/server.js`）。
  **手動マイグレーション不要。** `migrate dev` / `migrate reset` は
  開発専用なので VPS では絶対に実行しません（データ消失・drift の原因）。
- `ollama-pull` ワンショットコンテナが `OLLAMA_MODEL` を `ollama_data`
  ボリュームへ pull します。初回は gemma4:e2b で数分〜。
- **シードは投入しません。** `npm run db:seed` は開発用のダミーユーザー
  （`sample@teamnap.app` など）を作るので本番では実行しない。ステージング機のみ。

### 3. リバースプロキシ / TLS

`:3000` の前段に nginx か Caddy を置いて HTTPS 終端します。
WebSocket 在席（`/api/v1/realtime`）を通すため `Upgrade` / `Connection`
ヘッダのプロキシが必要です。Caddy 例:

```
api.example.com {
    reverse_proxy localhost:3000
}
```

（Caddy は WebSocket を自動でプロキシします。nginx なら
`proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";` を明示。）

モバイル側は `mobile/.env` の `EXPO_PUBLIC_API_URL=https://api.example.com/api/v1`
にしてビルドします（`ws://` は自動で `wss://` に置換されます）。

### 4. 更新デプロイ

```bash
git pull
docker compose up -d --build
```

- 起動時に `migrate deploy` が新しいマイグレーションだけ適用します。
- 本番では `migrate dev` を使わないので「Drift detected」は起きません。

### 5. 永続化・バックアップ・運用

- 名前付きボリューム: `postgres_data`（DB）、`ollama_data`（モデル）。
  **`postgres_data` を定期バックアップ**します:

  ```bash
  docker compose exec -T db pg_dump -U teamnap teamnap | gzip > backup-$(date +%F).sql.gz
  ```

- 全サービス `restart: unless-stopped`（`ollama-pull` を除く）なので再起動後も自動復帰。
- ヘルスチェック: `curl https://api.example.com/api/v1/health`。
- ログ: `docker compose logs -f backend` / `... ollama`。
  `docker compose logs ollama` に `llama-server ... signal: killed` が出たら
  RAM 不足 → `OLLAMA_MODEL=gemma3:1b` にして `docker compose up -d`。
- AI は Ollama が落ちていてもルールベース／定型文にフォールバックするので、
  Ollama の不調で API 全体が止まることはありません。

### 6. AI を使わない構成

Ollama を動かさない場合は `backend` と `db` だけ起動します:

```bash
docker compose up -d --build backend db
```

`OLLAMA_URL` に到達できなければ全 AI パスが自動でフォールバックします。

## 起動成功時のログ

アプリがマウントされると `POST /api/v1/health/frontend-boot` が飛び、Expo 側に
`[frontend] Frontend boot confirmed on ios ...`、Backend 側に
`[frontend-boot] Frontend booted successfully on ios ...` が出る。これが出れば
Mobile → Backend が疎通している。

## API リクエストが必ず失敗する（最優先チェック）

1. **Backend が起動しているか** — `curl .../health`、`docker compose ps`
   （`backend` が Up か）、`docker compose logs -f backend`（起動失敗の理由）。
   `backend` は `db` の healthy だけを待つ（`compose.yaml`）。ローカルで
   `npm start` するなら先に `npm run build`（`npm run dev` なら不要）。
2. **`EXPO_PUBLIC_API_URL` が実行環境に合っているか** — 値の表は
   「[環境変数 › Frontend](#frontendmobileenv)」。実機で急に繋がらなくなったら
   まず PC の LAN IP を疑う（下の「実機からいきなり Backend に繋がらなくなった」）。
3. **401 が返る** — `/health` と `/auth/{signup,login,password-reset/*}` 以外は
   すべて `Authorization: Bearer <token>` 必須。モバイルはログイン後
   `AuthContext` がトークンを付与する（未ログインだと 401）。

## その他よくある原因

- **root で `npm install` / `npm run db:migrate` などが失敗する**
  （`ENOENT ... package.json` / `Missing script`）
  - この Repository に root の `package.json` はありません。`cd backend`（または
    `cd mobile`）してから実行します。CI・手順書でこのミスが最多です。

- **`npm run db:migrate` が「Drift detected」で止まる**
  （`The following migration(s) are applied to the database but missing from the
  local migrations directory: <name>` / `We need to reset the "public" schema`）
  - 原因: そのマイグレーションを含むブランチで一度 DB に適用したあと、
    そのマイグレーションファイルを持たないブランチ（例 `develop`）に切り替えた。
    DB がマイグレーション履歴より **先行** している状態です。共有の Docker
    Postgres を複数ブランチで使い回すと起きます。
  - 直し方（いずれか）:

    | やりたいこと | 手順 |
    | --- | --- |
    | その機能を取り込む（データ維持・推奨） | `git checkout <そのマイグレーションを含むブランチ>` → `cd backend && npm run db:migrate`。または PR をマージして `git pull` |
    | 今のブランチのまま DB を作り直す | `cd backend && npm run db:reset`（`prisma migrate reset`。シードデータは消えて再投入される） |
    | データを残して余分な 1 マイグレーションだけ取り消す | `docker exec team-nap-app-db-1 psql -U teamnap -d teamnap -c 'DROP TABLE "<Table>";'` と `... -c "DELETE FROM _prisma_migrations WHERE migration_name='<name>';"` → `npm run db:migrate` |
  - `prisma migrate reset` / `migrate dev` は **開発 DB 専用**。VPS では絶対に実行しません（「本番デプロイ（VPS）」参照）。

- **`Error: listen EADDRINUSE: address already in use 0.0.0.0:3000`**
  - Docker の `backend` コンテナ（`0.0.0.0:3000` を publish）とローカルの
    `npm run dev` が両方ポート 3000 を取ろうとしています。どちらか一方にします。
  - ローカル開発を続ける場合:

    ```bash
    docker compose stop backend           # コンテナ側を止める
    pkill -f "tsx watch src/server.ts"    # 落ちきらないローカル watcher を掃除
    cd backend && npm run dev
    ```

  - 以後 `backend` コンテナを呼び戻さないため、Compose は
    `docker compose up -d db ollama` のように **サービスを指定** して起動します。
  - `docker compose stop backend` 直後に出る
    `npm error signal SIGTERM` / `command failed` / `Exited (1)` は
    **コンテナが停止指示で終了しただけ**で、エラーではありません。

- **実機からいきなり Backend に繋がらなくなった**（`サーバーに接続できません` /
  `boot notification failed`）
  - まず PC の LAN IP が変わっていないか: `ipconfig getifaddr en0`。
  - `mobile/.env` の `EXPO_PUBLIC_API_URL` を現在の IP に更新し、
    `cd mobile && npx expo start -c` で Metro をキャッシュクリア再起動。
    リロード（`r`）だけでは `.env` は読み直されません。
  - PC 上で `curl http://<その IP>:3000/api/v1/health` が返るか確認。
  - 恒久対策は Tailscale の IP（上の表）。

- **Expo Go で `Project is incompatible with this version of Expo Go`**
  - この app は Expo SDK 57。App Store の Expo Go が古いと開けません。Expo Go を
    更新するか、開発ビルド（`npx expo run:ios --device` / `eas build --profile
    development`）を使います。詳細は
    [device-testing.md](./device-testing.md) の §7。

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
