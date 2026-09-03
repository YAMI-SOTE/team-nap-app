# Team Nap 実装確認チェックリスト

> **Claude Code への依頼文（このファイルを渡すときに冒頭へ付ける）**
>
> ```text
> このRepository全体を確認し、以下のチェックリストに基づいて現在の実装状況を評価してください。
> 推測で「実装済み」と判断せず、必ず実際のFile・Config・Command結果を根拠にしてください。
> 可能な確認Commandは実行し、破壊的変更は行わず、まずAssessmentのみを行ってください。
> 最後にP0〜P3でRemaining Tasksを整理し、次に作成すべきGitHub Issuesを提案してください。
> ```
>
> 特に **「まずAssessmentのみ。勝手に修正しない」** を守ること。いきなり全体を
> 修正させず、まず現状評価 → Issue単位で実装、の順に進める。

## 目的

このチェックリストは、現在の Team Nap リポジトリについて以下を確認するために使用する。

1. 現在どこまで実装されているか確認する
2. Architecture / README / Database設計との整合性を確認する
3. 未実装・未検証の項目を洗い出す
4. 次に着手すべきIssue候補を整理する
5. Build / Docker / Prisma / Expo が正常に動作するか検証する

確認結果については、各項目を以下の形式で記録すること。

- [x] 実装済み・確認済み
- [ ] 未実装
- [~] 一部実装済み
- [!] 問題あり

必要に応じて各項目の下に以下を追記する。

```text
Status:
Evidence:
Problem:
Next Action:
```

---

## このリポジトリの実態（チェック時の対応表）

以下のチェックリストは一般的な命名で書いてある。**このリポジトリでの実体は
次のとおり**なので、確認時はこの対応で読み替える。

| チェックリストの名称 | このリポジトリでの実体 |
| --- | --- |
| `Schedule` モデル | `CalendarEvent`（`backend/prisma/schema.prisma`。per-user・Postgres 永続化。Google カレンダー取り込みあり） |
| `SleepSetting` モデル | 専用モデルなし。`Onboarding` 行の `bedtime` / `wakeTime` / `napCutoffHour` 列 |
| `RestSession` モデル | `NapRecord`（仮眠 1 回 = 1 行、`aiAdvice` 込み） |
| `RestRecommendation` モデル | 未実装（`rest-decision.service` はルールエンジンで存在するが履歴テーブルは無い） |
| `TeamMember` モデル | `TeamMembership`（`@@unique([teamId, userId])` + `@@unique([userId])`） |
| `/health` | `GET /api/v1/health` → `{ status, service: "team-nap-api", timestamp }` |
| `docs/architecture.md` | `docs/settings-architecture.md`（設定まわり） / `docs/team-feature.md`（チーム機能設計） |
| `docs/api.md` | `docs/auth.md`（認証・オンボーディング API） |
| `docs/database.md` | `docs/db.md` |
| `docs/use-case.md` | 相当は `docs/testing-guide.md`（手動検証手順） |
| llama.cpp + Gemma 3 1B | 現状は **Ollama**（`OLLAMA_URL` / `OLLAMA_MODEL`、`backend/src/services/ai.service.ts`）。`llm/` は `llm.md` とプロンプト（`prompts/personal.txt` / `team.txt`）のみ |

現行モデル一覧: `User` / `Session` / `PasswordResetToken` / `Onboarding` /
`NapRecord` / `CalendarEvent` / `Team` / `TeamMembership` + enum `MemberActivity`。

---

# 1. Repository Structure

## Root

* [ ] `README.md` が存在する
* [ ] `LICENSE` が存在する
* [ ] `.gitignore` が存在する
* [ ] `.env.example` が存在する
* [ ] `compose.yaml` が存在する
* [ ] `docs/` が存在する
* [ ] `mobile/` が存在する
* [ ] `backend/` が存在する
* [ ] `llm/` が存在する

## 不要ファイル確認

* [ ] `node_modules/` がGit管理されていない
* [ ] `dist/` がGit管理されていない
* [ ] `.env` がGit管理されていない
* [ ] `.expo/` がGit管理されていない
* [ ] `.gguf` Model fileがGit管理されていない
* [ ] TypeScriptの生成済み `.js` が `src/` 内に残っていない
* [ ] `.d.ts` / `.map` など不要なBuild Outputが `src/` に残っていない
* [ ] Repository root に不要な `package.json` / `package-lock.json` が無い（モノレポで管理単位は `backend/` と `mobile/`）

---

# 2. Git / GitHub

* [ ] `main` branch が正常に存在する（このリポジトリの統合先は `develop` → `main`）
* [ ] 不要な大量変更がGit Statusに表示されていない
* [ ] `.gitignore` がRootから各Projectに正しく適用されている
* [ ] `package-lock.json` がMobile / BackendともにGit管理されている
* [ ] `backend/prisma/migrations/` がGit管理されている
* [ ] Issueベースで作業できる状態になっている
* [ ] Feature branchを使用できる状態になっている

確認:

```bash
git status
git branch -a
git ls-files | grep node_modules
```

期待結果:

```text
node_modules が表示されない
.env が表示されない
dist が表示されない
```

---

# 3. Mobile / Expo

## 基本構造

* [ ] `mobile/package.json` が存在する
* [ ] `mobile/package-lock.json` が存在する
* [ ] `mobile/app.json` が存在する
* [ ] `mobile/tsconfig.json` が存在する
* [ ] `mobile/src/app/` が存在する
* [ ] Expo Router が正常に導入されている（SDK 57 / expo-router 7）

## Dependency

* [ ] `npm install` が成功する
* [ ] `npx expo-doctor` が重大Errorなしで終了する
* [ ] Expo packageのVersion mismatchがない
* [ ] `npm audit fix --force` によるDependency破損がない

確認:

```bash
cd mobile
npm install
npx expo-doctor
```

---

## Expo起動

* [ ] `npx expo start` が成功する
* [ ] Metro Bundlerが起動する
* [ ] iOS Simulatorで起動できる
* [ ] Androidまたは実機でも起動可能か確認する
* [ ] Expo Routerで画面遷移できる
* [ ] `EXPO_PUBLIC_API_URL` が Backend（LAN IP:3000）を指している

確認:

```bash
cd mobile
npx expo start
```

---

# 4. Mobile Architecture

想定構成:

```text
mobile/src/
├── app/
├── components/
├── features/
├── services/
├── hooks/
├── types/
├── constants/
└── utils/
```

確認:

* [ ] `app/` はScreen / Routingを担当している（薄いラッパで `features/` を呼ぶ）
* [ ] 画面本体は `features/<name>/<Name>Screen.tsx` に分離されている
* [ ] API処理がScreen内に直接大量記述されていない
* [ ] API処理は `services/` に分離されている（`api.ts` + `<feature>.ts`）
* [ ] 再利用UIは `components/` に分離されている
* [ ] Shared Typeは `types/api.ts` に配置されている
* [ ] Theme / Design Tokenは `theme/`（`colors.ts` / `spacing.ts`）に整理されている

---

# 5. Backend

## 基本構造

想定構成:

```text
backend/src/
├── app.ts
├── server.ts
├── routes/
├── controllers/
├── services/
├── middleware/
├── schemas/
├── realtime/
├── lib/
└── config/
```

確認:

* [ ] `app.ts` がExpress Application構成を担当している
* [ ] `server.ts` がServer起動を担当している（HTTP + WebSocket）
* [ ] Route / Controller / Service が分離されている
* [ ] DB処理がRouteに直接記述されていない
* [ ] LLM呼び出しがControllerに直接記述されていない（`services/ai.service.ts` に集約）
* [ ] `routes/index.ts` で `authenticate` を一括適用している（`/health` `/auth` を除く）

期待するFlow:

```text
Route → validate(zod) → Controller → Service → Prisma / Ollama
```

---

# 6. Backend TypeScript

* [ ] `npm run build` が成功する
* [ ] Build Outputは `dist/` のみに出力される
* [ ] `src/` に `.js` が生成されない
* [ ] `src/` に `.d.ts` が生成されない
* [ ] NodeNext / ESM構成が統一されている
* [ ] Relative importに必要な `.js` extensionが使用されている
* [ ] `npm run typecheck`（`tsc --noEmit`）が通る
* [ ] `npm test`（`tsx --test`）が通る

確認:

```bash
cd backend
npm run typecheck
npm test
npm run build
ls src dist
```

期待結果:

```text
src/  … .ts のみ
dist/ … app.js / server.js ほか
```

---

# 7. Backend Health Check

* [ ] Backendが起動する（`npm run dev`）
* [ ] `GET /api/v1/health` Endpointが存在する
* [ ] 正常なJSONを返す

確認:

```bash
cd backend
npm run dev
```

別Terminal:

```bash
curl http://localhost:3000/api/v1/health
```

期待例:

```json
{
  "status": "ok",
  "service": "team-nap-api",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

---

# 8. PostgreSQL

* [ ] PostgreSQL 17 Containerが `compose.yaml` に定義されている
* [ ] Docker Volumeが設定されている
* [ ] Database User / Database NameがEnvironment Variable化されている
* [ ] Container再起動後もDataが保持される

確認:

```bash
docker compose up -d
docker compose ps
```

---

# 9. Prisma

## Version

* [ ] `prisma` と `@prisma/client` のVersionが一致している（`^7.9.1`）
* [ ] `@prisma/adapter-pg` が導入されている（Prisma 7 driver adapter）

確認:

```bash
cd backend
npm list prisma @prisma/client @prisma/adapter-pg
```

---

## Prisma Config

* [ ] `backend/prisma.config.ts` が存在する
* [ ] `DATABASE_URL` が `prisma.config.ts` 側で渡されている
* [ ] `schema.prisma` の `datasource` に `url = env(...)` を書いていない（Prisma 7）
* [ ] `migrations.seed` が登録されている（`prisma migrate reset` 時にseedが走る）

---

## Prisma Validation

* [ ] Schema Validationが成功する
* [ ] Prisma Client生成が成功する

確認:

```bash
cd backend
npx prisma validate
npx prisma generate
```

---

# 10. Database Schema

現行Modelを確認する（対応表も参照）:

* [ ] User（`email` unique / `name?` / `avatar?` / `passwordHash?`）
* [ ] Session（bearer token の SHA-256 ハッシュ）
* [ ] PasswordResetToken
* [ ] Onboarding（初期設定 ＋ 設定画面の保存先: 睡眠 / 通知 / カレンダー連携状態）
* [ ] NapRecord（仮眠記録 ＋ `aiAdvice`）
* [ ] CalendarEvent（per-user 予定。`source` = manual / google、`externalId`）
* [ ] Team（`inviteCode` / `inviteCodeNormalized` unique）
* [ ] TeamMembership（`activity` / `wakeAssistEnabled` / `role`）

次段階（未実装）:

* [ ] RestRecommendation（休息提案の履歴・受諾フラグ）

Relation確認:

* [ ] User → NapRecord
* [ ] User → CalendarEvent
* [ ] User → Onboarding（1:1）
* [ ] User → Session / PasswordResetToken
* [ ] User → TeamMembership
* [ ] Team → TeamMembership

制約:

* [ ] User `email` が Unique
* [ ] Onboarding が User ごとに1件（`userId` PK）
* [ ] TeamMembership `(teamId, userId)` が Unique ＋ `(userId)` も Unique（1人1チーム）
* [ ] CalendarEvent `(userId, externalId)` が Unique
* [ ] Foreign Key と `onDelete: Cascade` が主要リレーションに設定されている

---

# 11. Prisma Migration

* [ ] 初期Migration〜最新Migrationが `backend/prisma/migrations/` に存在する
* [ ] MigrationがDatabaseへ適用できる
* [ ] Migration folderがGit管理されている
* [ ] `npm run db:seed` が再実行可能（upsert）

確認:

```bash
cd backend
npx prisma migrate status
npm run db:migrate
npm run db:seed
```

---

# 12. Docker

## Backend Image

* [ ] `backend/Dockerfile` が存在する
* [ ] `npm ci` が成功する
* [ ] `npx prisma generate` がDocker build中に成功する
* [ ] `npm run build` がDocker build中に成功する
* [ ] `dist/server.js` が存在する
* [ ] 起動時に `prisma migrate deploy` が走る（`npm start`）

---

## Compose

* [ ] Backend Serviceが定義されている
* [ ] DB Serviceが定義されている
* [ ] Backend → DBのNetwork接続が可能
* [ ] Backend Port `3000` が必要に応じて公開されている
* [ ] Database Portを不必要にPublic exposeしていないか確認する
* [ ] LLM（Ollama）Service追加余地がある

確認:

```bash
docker compose up --build
```

---

# 13. Docker Runtime Verification

* [ ] Backend ContainerがRunning
* [ ] DB ContainerがRunning
* [ ] Backend logsにCrashがない

確認:

```bash
docker compose ps
docker compose logs backend
docker compose logs db
curl http://localhost:3000/api/v1/health
```

---

# 14. Mobile → Backend Connection

* [ ] Mobile用API Serviceが存在する（`mobile/src/services/api.ts`）
* [ ] API Base URLを `EXPO_PUBLIC_API_URL` で指定できる
* [ ] Mobileから `/api/v1/health` を呼べる
* [ ] SimulatorからBackendへ接続できる
* [ ] 実機からBackendへ接続する場合、localhost問題（LAN IP 指定）を回避している

例:

```text
EXPO_PUBLIC_API_URL=http://<LOCAL_LAN_IP>:3000
```

---

# 15. AI / LLM

現状の実装を確認する（このリポジトリは **Ollama** ベース。llama.cpp 直叩きではない）。

* [ ] `llm/` directoryが存在する（`llm.md` ＋ `prompts/`）
* [ ] `backend/src/services/ai.service.ts` が LLM 呼び出しを集約している
* [ ] `OLLAMA_URL` / `OLLAMA_MODEL` が env で定義されている
* [ ] モデルタグが正しい（`config/env.ts` の既定 `gemma4:e2b` はタイポ疑い — 要確認）
* [ ] AIタイムアウトがある（`callGemma` に 30s。ユーザー導線では短縮を検討）
* [ ] AI失敗時のフォールバックがある（home / nap は canned copy、personal/team comment は無し）
* [ ] `.gguf` がGit管理されていない
* [ ] MobileからLLMへ直接接続していない（必ず Backend 経由）

想定:

```text
Mobile → Backend → Ollama → Gemma
```

---

# 16. AI Recommendation Architecture

現状: 休息判定は **ルールエンジン**（`rest-decision.service.ts` / `decideRestTiming`）。
Gemma は判定文の言い換えのみ。以下を Remaining Task として棚卸しする。

* [ ] `rest-recommendation.service.ts`（存在。実データ連携済み）
* [ ] `ai.service.ts`（存在。Ollama 呼び出し）
* [ ] Recommendation API（`POST /api/v1/rest/decision` 存在）
* [ ] Input JSON Schema
* [ ] Output JSON Schema
* [ ] Zod Validation
* [ ] Rule-based fallback（`decideRestTiming` 自体がルールベース）
* [ ] AI Timeout handling
* [ ] AI Error handling
* [ ] Recommendation persistence（未実装 = RestRecommendation テーブル）
* [ ] `napCutoffHour`（設定値）を `decideRestTiming` に反映
* [ ] チームレベルの提案（`handleSuggestTeamNap` は現状 TODO）

---

# 17. Documentation

`docs/` を確認する（実ファイル名）。

* [ ] `docs/setup.md`
* [ ] `docs/db.md`
* [ ] `docs/auth.md`
* [ ] `docs/team-feature.md`
* [ ] `docs/settings-architecture.md`
* [ ] `docs/testing-guide.md`
* [ ] `docs/test-account.md`
* [ ] `docs/ai-development.md`

README確認:

* [ ] Install手順（`backend/` と `mobile/` で別々に `npm install`）
* [ ] Mobile起動方法
* [ ] Backend起動方法
* [ ] Docker起動方法
* [ ] Prisma操作方法（`db:migrate` / `db:seed` / `db:reset`）
* [ ] Environment Variables（`.env.example` と一致しているか）
* [ ] Git Workflow

---

# 18. Figma / UI Implementation

Designerとの連携状態を確認する。

* [ ] Figma Designが共有されている
* [ ] Main Screenが確定している
* [ ] Design Tokenが整理されている（`mobile/src/theme/colors.ts` / `spacing.ts`）
* [ ] Color
* [ ] Typography
* [ ] Spacing
* [ ] Border Radius
* [ ] Component State

Figma generated code をそのまま Architecture として使用せず、React Native
Component へ整理する（`mobile/src/components/` / `components/ui/`）。

---

# 19. Core MVP Remaining Tasks

以下を実装状況に応じて分類する。

## Authentication

* [ ] User registration（`POST /auth/signup`）
* [ ] Login（`POST /auth/login`）
* [ ] Logout（`POST /auth/logout`）
* [ ] Auth Middleware（`authenticate`）
* [ ] Mobile Auth state（`AuthContext` / secure-store）
* [ ] Password reset（`/auth/password-reset/*`）

## Schedule

* [ ] Schedule List（`GET /schedule/day`）
* [ ] Schedule Create（`POST /schedule/events`）
* [ ] Schedule Edit（`PUT /schedule/events/:id`）
* [ ] Schedule Delete（`DELETE /schedule/events/:id`）
* [ ] Schedule API（per-user）
* [ ] Schedule DB persistence（`CalendarEvent`）
* [ ] Google カレンダー取り込み（`/settings/calendar/google/sync`）

## Sleep

* [ ] Sleep Setting UI
* [ ] Sleep Setting API（`/settings/sleep-schedule`）
* [ ] Sleep Setting persistence（`Onboarding` 行）

## Home

* [ ] Today's schedule
* [ ] Next free time（`getNextFreeSlot`）
* [ ] Rest recommendation（`/rest/decision`）
* [ ] Loading state
* [ ] Empty state
* [ ] Error state
* [ ] Solo（チーム未加入）レイアウト

## Rest

* [ ] 15-minute Timer
* [ ] Start
* [ ] Pause / Resume
* [ ] Cancel
* [ ] Completion handling（評価 → ふりかえり）
* [ ] Rest Session saving（`POST /naps` → `NapRecord` ＋ `aiAdvice`）

---

# 20. Team Features

* [ ] Team作成（`POST /teams`）
* [ ] Team参加（`POST /teams/join`）
* [ ] Member一覧（`/home/member-status` / `/settings/team`）
* [ ] メンバーのライブ在席（WebSocket `/api/v1/realtime`）
* [ ] メンバー管理（owner のみ、`DELETE /teams/members/:id`）
* [ ] 招待リンク共有（deep link）
* [ ] Wake / Rest ナッジ（`/teams/members/:id/{wake,rest}`）
* [ ] チーム仮眠提案（`/teams/nap-suggestion`）
* [ ] Team平均 / サマリー（現状は静的スナップショット = 要 DB 化）
* [ ] Rest ranking（現状は静的ダミー = 要 DB 化）
* [ ] Team notification（現状インメモリ = 要永続化）
* [ ] メンバーの選択アイコン表示（全ロースター）

---

# 21. Stats

* [ ] Rest history（`/naps/history`）
* [ ] Rest score（個人 = `NapRecord` 由来の実データ）
* [ ] Daily summary
* [ ] Weekly summary（今週 = 日曜〜土曜、`calendarWeek`）
* [ ] 今週のコンディション折れ線（未来の日はプロットしない）
* [ ] Recommendation acceptance（未実装 = RestRecommendation）
* [ ] Personalization用Data
* [ ] チーム統計（現状ゼロ埋め = 要 per-member 集計）

---

# 22. Security / Configuration

* [ ] `.env` がGit管理されていない
* [ ] Password / SecretがSource CodeにHardcodeされていない
* [ ] Backend Input Validation（zod）が全 mutating route にある
* [ ] エラーメッセージが日本語で統一されている
* [ ] DBへMobileから直接接続できない
* [ ] LLMへMobileから直接接続できない
* [ ] CORS設定を確認する（現状 `cors()` 全開放 = 要 allowlist）
* [ ] `helmet` / rate-limit（`/auth/login` 等）を検討
* [ ] `ensureUser` / `DEV_USER_ID` フォールバックの要否を確認（現行経路では未到達）
* [ ] Production時のHTTPS対応予定をDocument化する

---

# 23. Final Verification Commands

以下を順番に実行する。

## Mobile

```bash
cd mobile
npm install
npx expo-doctor
npx tsc --noEmit
npx expo start
```

## Backend

```bash
cd backend
npm install
npx prisma validate
npx prisma generate
npm run typecheck
npm test
npm run build
```

## Docker

Repository root:

```bash
docker compose down
docker compose up --build
docker compose ps
```

## API

```bash
curl http://localhost:3000/api/v1/health
```

---

# 24. Claude Code 出力形式

確認完了後、以下の形式で結果を出力すること。

## A. 現在の実装状況

```text
Implemented:
Partially Implemented:
Not Implemented:
Broken:
```

## B. Critical Problems

Build / Runtime / Architecture上、優先して修正すべき問題を列挙する。

Priority:

```text
P0 = 起動不能 / Build不能
P1 = Core MVPをBlocking
P2 = MVPには必要だがBlockingではない
P3 = Later / Nice to have
```

## C. Remaining Tasks

以下の形式で整理する。

```text
[P0] Task name
Reason:
Files:
Verification:
```

## D. 推奨GitHub Issues

未完了Taskから、実装単位でIssue候補を生成する。

例:

```text
[Backend] チームサマリー / ランキングを NapRecord 由来の実データにする
[Backend] 通知フィードを Postgres に永続化する
[Backend] チーム仮眠提案を end-to-end で実装（空きスロット + overdue 判定 + fan-out）
[AI] Ollama モデルタグを検証し personal/team comment にフォールバック追加
[Infra] CORS allowlist + helmet + auth rate-limit + CI（tsc/test）
[Mobile] 実機でのスワイプ / ナビゲーション挙動を検証
```

## E. 次に実施する3項目

現在のRepository状態から、次に行うべきTaskを優先順に3つだけ提示する。

各Taskについて:

```text
1. Task
Why:
Files to modify:
How to verify:
```

---

# 完了条件

Architecture Reviewが完了したと判断する条件:

* [ ] Mobileが起動する
* [ ] BackendがBuildできる
* [ ] Docker Composeが起動する
* [ ] PostgreSQLが起動する
* [ ] Prisma Validationが通る
* [ ] Prisma Clientが生成できる
* [ ] `GET /api/v1/health` が正常Responseを返す
* [ ] Gitに不要な生成物が含まれていない
* [ ] Remaining TasksがPriority付きで整理されている
* [ ] 次のGitHub Issues候補が明確になっている
