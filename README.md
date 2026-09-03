# TEAM-NAP-APP

チームメンバーの休息・睡眠・スケジュール情報をもとに、最適な休息タイミングを提案するモバイルアプリケーションです。

本プロジェクトでは、React Native / Expo によるモバイルアプリ、Node.js / Express によるバックエンドAPI、PostgreSQL によるデータ保存、Ollama 上で動く Gemma によるAI休息提案を組み合わせて開発します。

---

## 概要

Team Napでは、以下のような機能の実装を予定しています。

- スケジュール登録・管理
- 睡眠時間の登録
- 空き時間の検出
- AIによる休息タイミングの提案
- 15分休息タイマー
- 休息記録
- 休息スコア
- チームメンバーとの休息状況共有
- チーム内ランキング・通知

---

## システム構成

```text
Mobile App
React Native + Expo (expo-router)
        |
        | REST /api/v1/*  (Bearer)  +  WebSocket /api/v1/realtime
        v
Backend API
Node.js + Express 5 + TypeScript
        |
        +-------------------+
        |                   |
        v                   v
PostgreSQL 17         Ollama
Prisma 7 + adapter-pg  Gemma（AI コメント生成）
```

モバイルアプリからPostgreSQLやLLMへ直接アクセスせず、すべてBackend APIを経由します。
全体像は [docs/architecture.md](docs/architecture.md) を参照。

---

## ディレクトリ構成

```text
team-nap-app/
├── mobile/               # React Native / Expo
│   ├── src/
│   ├── assets/
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── backend/              # Node.js / Express API
│   ├── src/
│   ├── prisma/
│   ├── prisma.config.ts
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md         # バックエンド詳細（英語）
│   └── README.ja.md      # バックエンド詳細（日本語）
│
├── llm/                  # Ollama / Gemma関連（プロンプト等）
│
├── docs/                 # 設計資料（入口: architecture.md）
│   ├── architecture.md          # 全体構成の概要 + 各ドキュメントへの地図
│   ├── setup.md                 # セットアップ手順・トラブルシュート
│   ├── db.md                    # Prisma スキーマ / ER 図 / マイグレーション
│   ├── auth.md                  # 認証・セッション・オンボーディング
│   ├── team-feature.md          # チーム機能のバックエンド設計
│   ├── settings-architecture.md # 設定タブの Screen ↔ API ↔ DB 対応
│   ├── ai-development.md        # AI コメント機能（Ollama / Gemma）
│   ├── testing-guide.md         # 機能ごとの手動確認手順
│   ├── test-account.md          # シードのテストアカウント / パスワード
│   └── implementation-checklist.md  # 実装点検チェックリスト
│
├── compose.yaml          # Docker Compose設定（backend / db / ollama）
├── .env.example          # ※ルートに .env は無い。backend/ と mobile/ 参照
├── .gitignore
├── LICENSE
└── README.md
```

---

# 開発環境

## 必要なソフトウェア

開発を始める前に、以下をインストールしてください。

### Node.js

Node.js 22系を推奨します。

確認:

```bash
node -v
npm -v
```

### Docker

PostgreSQLやバックエンドサービスの起動にDockerを使用します。

macOSの場合はDocker Desktopをインストールしてください。

確認:

```bash
docker --version
docker compose version
```

Docker Desktopを起動した状態で使用してください。

### Git

確認:

```bash
git --version
```

---

# インストール

## 1. Repositoryをclone

```bash
git clone <repository-url>
cd team-nap-app
```

---

## 2. Mobile dependencies

```bash
cd mobile
npm install
```

Expo環境を確認:

```bash
npx expo-doctor
```

アプリを起動:

```bash
npx expo start
```

Expo Dev Toolsが起動します。

必要に応じて以下から実行できます。

- iOS Simulator
- Android Emulator
- Expo Go
- Development Build

---

## 3. Backend dependencies

Repository rootから:

```bash
cd backend
npm install
```

Prisma Clientを生成:

```bash
npx prisma generate
```

TypeScript build:

```bash
npm run build
```

開発サーバー:

```bash
npm run dev
```

---

# 環境変数

`.env` は **`backend/` と `mobile/` にそれぞれ** 置きます（ルートには置きません）。
各ディレクトリの `.env.example` をコピーして作成してください。詳しい説明と
実行環境別の値は [docs/setup.md](docs/setup.md) にあります。

```bash
cp backend/.env.example backend/.env
cp mobile/.env.example  mobile/.env
```

## Backend（`backend/.env`）

`backend/src/config/env.ts` が zod で検証します。`DATABASE_URL` は必須。

```env
# ローカル実行（npm run dev、Postgres は docker compose up -d db）
DATABASE_URL=postgresql://teamnap:teamnap_dev@localhost:5432/teamnap
# Docker Compose 内では DB ホストは db:
#   postgresql://teamnap:teamnap_dev@db:5432/teamnap

PORT=3000
HOST=0.0.0.0

OLLAMA_URL=http://localhost:11434   # Compose 内では http://ollama:11434
OLLAMA_MODEL=gemma4:e2b             # ※タグ要確認（AI が canned にフォールバックする場合はここ）
```

## Mobile（`mobile/.env`）

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

実機で確認する場合は `localhost` を開発マシンの LAN IP に置き換えます。
`.env` は Expo 起動時のみ読まれるため、変更後は Expo を再起動してください。

`.env` はGitにcommitしないでください（各 `.env.example` のみ commit）。

---

# Docker

Repository rootで実行します。

```bash
docker compose up --build
```

Backgroundで起動する場合:

```bash
docker compose up -d --build
```

状態確認:

```bash
docker compose ps
```

ログ確認:

```bash
docker compose logs
```

停止:

```bash
docker compose down
```

---

# Docs

- [docs/architecture.md](docs/architecture.md) — 全体構成の概要と各ドキュメントへの地図（まずここ）
- [docs/setup.md](docs/setup.md) — 環境構築・起動手順（Mobile / Backend / Docker）、トラブルシュート
- [docs/db.md](docs/db.md) — Prisma スキーマ、ER 図、各テーブル、マイグレーション一覧
- [docs/auth.md](docs/auth.md) — 認証・セッション・パスワード再設定・オンボーディング（バックエンド）
- [docs/team-feature.md](docs/team-feature.md) — チーム機能のバックエンド実装（作成 / 参加 / 在席 / ナッジ / 提案 / WebSocket）
- [docs/settings-architecture.md](docs/settings-architecture.md) — 設定タブの Screen ↔ hook ↔ API ↔ `Onboarding` 行の対応
- [docs/ai-development.md](docs/ai-development.md) — AI コメント機能（Ollama / Gemma）の構成と編集ポイント
- [docs/testing-guide.md](docs/testing-guide.md) — 機能を手で確認する手順
- [docs/test-account.md](docs/test-account.md) — テスト用アカウント（`*@teamnap.app` は `samplepass123` / `*@teamnap.local` は `teamnap-dev`。`npm run db:seed` で投入）
- [docs/implementation-checklist.md](docs/implementation-checklist.md) — リポジトリ全体の実装点検チェックリスト

---

# PostgreSQL / Prisma

Prisma schema:

```text
backend/prisma/schema.prisma
```

Prisma設定:

```text
backend/prisma.config.ts
```

Schema validation:

```bash
cd backend
npx prisma validate
```

Prisma Client生成:

```bash
npx prisma generate
```

Migration作成:

```bash
npx prisma migrate dev --name <migration-name>
```

`backend/package.json` には npm script も用意しています。

```bash
npm run db:generate   # prisma generate
npm run db:migrate     # prisma migrate dev
npm run db:seed        # 開発ユーザー + チーム(NAP-4821) を投入
npm run db:reset       # DB 作り直し + シード
npm run db:studio      # GUI で閲覧
```

`prisma/migrations/` はGitにcommitしてください。
Migrationはチーム全体で同じDatabase Schemaを再現するために必要です。
Compose / 本番では `npm start` が起動時に `prisma migrate deploy` を実行します。

現在のモデルは `User` / `Session` / `PasswordResetToken` / `Onboarding` /
`NapRecord` / `CalendarEvent` / `Team` / `TeamMembership` です（詳細は
[docs/db.md](docs/db.md)、チーム機能のバックエンド設計は
[docs/team-feature.md](docs/team-feature.md)）。

---

# Backend

詳細は [backend/README.ja.md](backend/README.ja.md)（英語版: [backend/README.md](backend/README.md)）を参照してください。

Backendは以下の構造を基本とします。

```text
src/
├── server.ts       エントリポイント（ポートのバインドのみ）
├── app.ts          Express アプリ（ミドルウェア + ルーターのマウント）
├── config/         process.env を読むのはここだけ（env.ts）
├── routes/         <feature>.routes.ts — パス + validate() + コントローラ接続
│   └── index.ts    全ルーターを /api/v1 にマウント
├── controllers/    HTTP の入出力のみ。ロジックは持たない
├── services/       ドメインロジック（チーム系は Prisma で永続化、その他は一部インメモリ）
├── schemas/        zod のリクエストスキーマ
├── middleware/     エラーハンドラ / 404 / validate / リクエストログ
├── lib/            フレームワーク非依存のヘルパー（http-error, params, datetime）
└── types/          共有ドメイン型（domain.ts）
```

基本的な処理フロー:

```text
Route
  ↓ validate({ body?, params?, query? })   ← zod。不正な入力は 400
Controller                                  ← <動詞><名詞>Controller
  ↓
Service
  ↓
Prisma（PostgreSQL）/ LLM
```

エラーはどこからでも `HttpError` を throw し、`errorHandler` が
適切なステータスで `{ error }` を返します。

---

## Health Check

Backend起動後:

```bash
curl http://localhost:3000/api/v1/health
```

正常な場合:

```json
{
  "status": "ok",
  "service": "team-nap-api",
  "timestamp": "2026-08-30T06:10:41.398Z"
}
```

---

# Mobile

MobileアプリではExpo Routerを使用します。

予定している構造:

```text
src/app/
├── _layout.tsx
├── (auth)/
│   ├── login.tsx
│   └── onboarding.tsx
│
├── (tabs)/
│   ├── index.tsx
│   ├── schedule.tsx
│   ├── rest.tsx
│   ├── team.tsx
│   ├── stats.tsx
│   └── settings.tsx
│
└── member/
    └── [id].tsx
```

API通信はScreenから直接行わず、

```text
src/services/
```

を経由してください。

例:

```text
Screen
  ↓
Component
  ↓
Service
  ↓
Backend API
```

---

# AI

AIによる休息提案・コメント生成には以下を使用します。

- Ollama（`ollama/ollama` イメージ）
- Gemma（モデルは `OLLAMA_MODEL` で指定。`compose.yaml` の既定は `gemma4:e2b` ※タグ要確認）

LLMはDocker上で動作させ、Backendから `OLLAMA_URL`（既定 `http://localhost:11434`）経由で呼び出します。

```text
Mobile
  ↓
Backend
  ↓
Ollama
  ↓
Gemma
```

MobileからLLMを直接呼び出さない構成とします。

## 休息提案（ルールエンジン）

`POST /api/v1/rest/decision` は body を取らず、その日の `NapRecord`・睡眠設定・
現在時刻・空き時間から判定します（`src/services/rest-decision.service.ts` の
`decideRestTiming`）。レスポンス例:

```json
{
  "shouldRest": true,
  "needScore": 2,
  "recommendedMinutes": 15,
  "recommendedStart": "14:40",
  "recommendedEnd": "14:55",
  "reasonCode": "REST_RECOMMENDED"
}
```

`reasonCode` は `REST_RECOMMENDED | RECENTLY_RESTED | NO_FREE_TIME | TOO_LATE
| NO_REST_NEEDED`。

## AIコメント生成（Ollama / Gemma）

判定結果や統計を **短い日本語コメントに言い換える** だけを LLM が担当します
（`src/services/ai.service.ts`）。入出力は JSON。Ollama 停止時は home / nap 系は
定型文にフォールバックします（詳細は [docs/ai-development.md](docs/ai-development.md)）。

---

# Git / GitHub 開発フロー

IssueごとにBranchを作成します。

例:

```bash
git checkout main
git pull
git checkout -b feature/21-home-next-free-time
```

作業後:

```bash
git add .
git commit -m "feat: add next free time card"
git push -u origin feature/21-home-next-free-time
```

Pull Requestには対応するIssueを記載してください。

```text
Closes #21
```

---

# Gitで管理しないもの

以下はGitにcommitしません。

```text
node_modules/
dist/
.env
.expo/
*.log
models/*.gguf
```

一方、以下はcommitします。

```text
package.json
package-lock.json
prisma/schema.prisma
prisma/migrations/
compose.yaml
.env.example
```

---

# 開発初期目標

最初のMilestoneでは、以下が動作することを目標とします。

```text
Mobile starts
Backend starts
PostgreSQL starts
Prisma works
Docker Compose works
GET /api/v1/health works
```

その後、

```text
Schedule
→ Home
→ Rest
→ Rest Record
→ AI Recommendation
```

の順に機能を追加していきます。

---

# 注意事項

Expo関連packageはSDKとのVersion依存が強いため、可能な限り以下を使用してください。

```bash
npx expo install <package>
```

Version不整合を確認する場合:

```bash
npx expo-doctor
```

必要に応じて:

```bash
npx expo install --fix
```

`npm audit fix --force` はExpoやその他の依存Packageを破壊的に更新する可能性があるため、内容を確認せず実行しないでください。

---

# License

See [LICENSE](./LICENSE).

```

このREADMEなら、**新しいメンバーがcloneしてからどこで何を実行するか**までかなり明確になります。

特にインストール手順では、「どのディレクトリで実行するか」を明記しておくのが重要です。`npm install` は `mobile/` と `backend/` でそれぞれ実行し、`docker compose` はRepository rootで実行する、という区別をREADMEに残しておくとチーム内の混乱をかなり減らせます。
```
