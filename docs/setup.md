# セットアップ

## 前提

- Repository root で `docker compose up --build` を実行すると、Backend / PostgreSQL / Ollama が起動します。
- Frontend の Expo は Docker Compose では起動しません。`mobile/` で別プロセスとして起動します。

## Frontend 環境変数

`mobile/.env` に以下を設定します。

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Expo は起動時に `.env` を読むため、変更後は Expo を再起動してください。

## 起動手順

### 1. Backend / DB / Ollama を起動

Repository root で実行します。

```bash
docker compose up --build
```

Backend の確認:

```bash
curl http://localhost:3000/api/v1/health
```

### 2. Frontend を起動

`mobile/` で実行します。

```bash
npm start
```

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

- `EXPO_PUBLIC_API_URL is not configured`
  - `mobile/.env` が未設定、または Expo を再起動していない可能性があります。
- Frontend の boot ログが Expo にだけ出て Docker に出ない
  - Backend が起動していない、または `EXPO_PUBLIC_API_URL` の値が誤っています。
