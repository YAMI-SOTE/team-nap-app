# TEAM-NAP-APP

チームメンバーの休息・睡眠・スケジュール情報をもとに、最適な休息タイミングを提案するモバイルアプリケーションです。

本プロジェクトでは、React Native / Expo によるモバイルアプリ、Node.js / Express によるバックエンドAPI、PostgreSQL によるデータ保存、Gemma + llama.cpp によるAI休息提案を組み合わせて開発します。

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
React Native + Expo
        |
        | REST API / JSON
        v
Backend API
Node.js + Express + TypeScript
        |
        +-------------------+
        |                   |
        v                   v
PostgreSQL             llama.cpp
Prisma                 Gemma 3 1B
```

モバイルアプリからPostgreSQLやLLMへ直接アクセスせず、すべてBackend APIを経由します。

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
│   └── tsconfig.json
│
├── llm/                  # llama.cpp / Gemma関連
│
├── docs/                 # 設計資料
│   ├── setup.md          # セットアップ手順
│
├── compose.yaml          # Docker Compose設定
├── .env.example
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

`.env.example` をコピーして `.env` を作成してください。

```bash
cp .env.example .env
```

例:

```env
DB_PASSWORD=teamnap_dev
```

Backend用の環境変数は以下のようになります。

```env
DATABASE_URL=postgresql://teamnap:teamnap_dev@db:5432/teamnap
LLM_URL=http://llm:8080
PORT=3000
```

`.env` はGitにcommitしないでください。

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

- [docs/setup.md](docs/setup.md)
- [docs/ai-development.md](docs/ai-development.md)
- [docs/db.md](docs/db.md)

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

例:

```bash
npx prisma migrate dev --name init
```

`prisma/migrations/` はGitにcommitしてください。

Migrationはチーム全体で同じDatabase Schemaを再現するために必要です。

---

# Backend

Backendは以下の構造を基本とします。

```text
src/
├── app.ts
├── server.ts
├── routes/
├── controllers/
├── services/
├── middleware/
├── schemas/
└── lib/
```

基本的な処理フロー:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Prisma / LLM
```

---

## Health Check

Backend起動後:

```bash
curl http://localhost:3000/health
```

正常な場合:

```json
{
  "status": "ok",
  "service": "team-nap-backend"
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

AIによる休息提案には以下を使用する予定です。

- Gemma 3 1B
- llama.cpp

LLMはDocker上で動作させ、BackendからHTTP API経由で呼び出します。

```text
Mobile
  ↓
Backend
  ↓
llama.cpp
  ↓
Gemma
```

MobileからLLMを直接呼び出さない構成とします。

AIの入出力はJSON形式を基本とします。

例:

```json
{
  "sleepHours": 5.5,
  "minutesSinceLastRest": 120,
  "nextFreeTimeMinutes": 30
}
```

Response:

```json
{
  "recommended": true,
  "type": "nap",
  "durationMinutes": 15,
  "reasonCode": "LOW_SLEEP"
}
```

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
GET /health works
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
