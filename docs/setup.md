# セットアップ

> 機能を手で確認する手順は [testing-guide.md](./testing-guide.md)、
> テスト用アカウント / スケジュールは [test-account.md](./test-account.md)、
> 実機（iPhone / Android）で複数アカウントを試す手順は
> [device-testing.md](./device-testing.md)。
>
> つまずいたら先に「[その他よくある原因](#その他よくある原因)」を見てください
> （root で `npm` を叩いて失敗 / `Drift detected` / `EADDRINUSE :3000` /
> 実機から繋がらない / Expo Go incompatible）。VPS へのデプロイは
> 「[本番デプロイ（VPS）](#本番デプロイvps)」。

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

> **`npm` 系コマンドは必ず `backend/` の中で実行します。** この Repository には
> root の `package.json` がありません（monorepo だが npm workspaces 未使用）。
> root で `npm install && npm run db:migrate && ...` を実行すると
> `ENOENT: no such file or directory, open '.../package.json'` /
> `Missing script: "db:migrate"` で失敗します。`mobile/` も同様に別途 `npm install`。

```bash
docker compose up -d db ollama   # DB（と AI を使うなら Ollama）のみ起動。backend コンテナは起動しない
cd backend                       # ← 以降は必ず backend/ の中
npm install
npm run db:generate              # Prisma Client 生成
npm run db:migrate               # マイグレーション適用（prisma migrate dev）
npm run db:seed                  # 開発データ投入
npm run dev                      # tsx watch でサーバー起動（PORT=3000 / HOST=0.0.0.0）
```

- `docker compose up -d db` ではなく `docker compose up -d db ollama` を使うのがポイントです。
  `docker compose up`（引数なし）は `backend` コンテナも起動し、ローカルの `npm run dev` と
  ポート 3000 を取り合って `EADDRINUSE` になります（下の「よくある原因」参照）。
- DB をまっさらに戻したいときは `npm run db:reset`（マイグレーション再適用 + シード）。
- ブランチを切り替えて `npm run db:migrate` が「Drift detected」で止まるときは
  「よくある原因」の該当項目を参照してください。

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
   | 実機（Tailscale） | `http://<PCのTailscale IP>:3000/api/v1`（例 `http://100.96.10.125:3000/api/v1`） |

   - PC の LAN IP は `ipconfig getifaddr en0`（macOS）で確認します。**DHCP で
     頻繁に変わります。**「昨日は繋がったのに」の大半はこれです。
   - `EXPO_PUBLIC_*` はビルド時にバンドルへ埋め込まれます。`.env` を変えたら
     **Metro をキャッシュクリアして再起動**しないと反映されません。アプリのリロード
     （`r`）だけでは足りません。

     ```bash
     cd mobile
     npx expo start -c
     ```

   - IP が変わるたびに直すのが面倒なら Tailscale の IP（ネットワークをまたいでも
     不変）を使います。PC と実機の両方に Tailscale を入れておきます。
   - Backend が LAN からも見えている必要があります（`HOST=0.0.0.0`。既定で設定済み）。
     PC 上で `curl http://<PCのLAN IP>:3000/api/v1/health` が返るか確認します。
     返らなければファイアウォール、または Backend が `127.0.0.1` だけに bind しています。

3. **認証が要るエンドポイントで 401 が返る**
   - `/api/v1/{teams,notifications,onboarding}/*` と `/settings/team*` は
     `Authorization: Bearer <token>` 必須。モバイルはログイン後
     `AuthContext` がトークンを付与します（未ログインだと 401）。

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
