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
| `docs/architecture.md` | **存在する**（PR #42 で追加。全体構成 + 詳細ドキュメントへの索引） |
| `docs/api.md` | `docs/auth.md`（認証・オンボーディング API） |
| `docs/database.md` | `docs/db.md` |
| `docs/use-case.md` | 相当は `docs/testing-guide.md`（手動検証手順） |
| llama.cpp + Gemma 3 1B | **Ollama**。既定モデル `gemma3:1b`（軽量。`gemma3n:e2b` は ~8GB 必要で任意）。`OLLAMA_URL` / `OLLAMA_MODEL` / `OLLAMA_TIMEOUT_MS`（既定 30s）、`callGemma` は `keep_alive:"30m"`。`backend/src/services/ai.service.ts` に集約。`llm/` は `llm.md` ＋ `prompts/{personal,team}.txt` のみ |

現行モデル一覧: `User` / `Session` / `PasswordResetToken` / `Onboarding` /
`NapRecord` / `CalendarEvent` / `Team` / `TeamMembership` + enum `MemberActivity`。

---

## 直近の対応状況（2026-09-03 時点）

初回点検（PR #41）以降に片付いたもの／残っているもの。詳細は各 PR。

### 解決済み

- **expo-doctor 3 失敗 → 21/21 pass**
  - app.json の `splash` を `expo-splash-screen` プラグインへ移設（PR #43）
  - `expo-font` を直接依存に追加（PR #43）
  - `expo` / `expo-router` / `expo-linking` / `expo-secure-store` / `expo-constants` を SDK 57 パッチ版へ（PR #46）
- **AI（Ollama）が実際に生成する状態に**（PR #44 / #47）
  - 既定モデルを実在・軽量タグ `gemma3:1b` に（`gemma4:e2b` は重すぎてタイムアウト固定だった）
  - `callGemma` に `keep_alive:"30m"`、`OLLAMA_TIMEOUT_MS`（30s）を env 化
  - `/ai/personal-comment` `/ai/team-comment` も失敗時フォールバック（旧: 502）
  - `docker compose up` で end-to-end 検証済み（`ollama list` にモデル / `/ai/personal-comment` が生成文 / Home headline が canned と変わる / `POST /naps` の `aiAdvice` が Gemma 出力）
- **ドキュメント**：`docs/architecture.md` 追加（PR #42）、README のリンク切れ・環境変数節を修正（PR #42）、`docs/device-testing.md` 追加（PR #45）、root `.env.example` を per-package へのポインタに（PR #42）

### 残タスク（優先度つき）

| 優先 | 項目 |
| --- | --- |
| P2 | CI が無い（PR ごとの backend `tsc`/`test`、mobile `tsc` を回す GitHub Actions） |
| P2 | Backend セキュリティ：`cors()` 全開放・`helmet` なし・`/auth/login` に rate-limit なし |
| P2 | チームサマリー / ランキング / チームスコアが固定ダミー（`team.service` / `home.service` の snapshot） |
| P2 | 通知フィードがインメモリ（`notifications.service` の `Map`、再起動で消える） |
| P2 | Push 通知なし（`expo-notifications` 未導入。アプリ起動中のみ通知が届く） |
| P2 | チーム統計がゼロ埋め（`stats.service.getTeamStats`、per-member 集計なし） |
| P3 | `RestRecommendation` 永続化（提案履歴・受諾フラグのテーブル） |
| P3 | `napCutoffHour`（設定値）が `decideRestTiming` に未反映 |
| P3 | root `LICENSE` が空 |
| P3 | `gemma3:1b` は日本語がやや粗い（品質重視なら要 8GB/2CPU の `gemma3n:e2b`） |

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
* [x] `npx expo-doctor` → **21/21 pass**（PR #43 / #46 で 3 失敗を解消）
* [x] Expo package の version mismatch なし（SDK 57 のパッチ版に整合）
* [ ] `npm audit fix --force` によるDependency破損がない（実行しない前提）

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

* [x] `llm/` directoryが存在する（`llm.md` ＋ `prompts/{personal,team}.txt`）
* [x] `backend/src/services/ai.service.ts` が LLM 呼び出しを集約（`callGemma`）
* [x] `OLLAMA_URL` / `OLLAMA_MODEL` / `OLLAMA_TIMEOUT_MS` を env で定義（`config/env.ts`）
* [x] モデルタグ：既定 `gemma3:1b`（実在・軽量）。`gemma3n:e2b` は任意（~8GB）
* [x] AIタイムアウト：`callGemma` は `OLLAMA_TIMEOUT_MS`（既定 30s、env 調整可）＋ `keep_alive:"30m"`
* [x] AI失敗時のフォールバック：home / nap / personal / team すべて（rule-based / 定型文）
* [x] **AI 生成の end-to-end 検証済み**（PR #47。`docker compose up` → `/ai/personal-comment` が生成文、Home headline が変わる、`POST /naps` の `aiAdvice` が Gemma 出力）
* [x] `.gguf` がGit管理されていない（`.gitignore` に `*.gguf`）
* [x] MobileからLLMへ直接接続していない（`services/api.ts` 経由で Backend のみ）

想定:

```text
Mobile → Backend → Ollama → Gemma
```

---

# 16. AI Recommendation Architecture

現状: 休息判定は **ルールエンジン**（`rest-decision.service.ts` / `decideRestTiming`）。
Gemma は判定文の言い換えのみ。以下を Remaining Task として棚卸しする。

* [x] `rest-recommendation.service.ts`（存在。実データ連携済み）
* [x] `ai.service.ts`（存在。Ollama 呼び出し）
* [x] Recommendation API（`POST /api/v1/rest/decision`）
* [x] Zod Validation（`schemas/ai.schema.ts` / rest は body なし）
* [x] Rule-based fallback（`decideRestTiming` 自体がルールベース）
* [x] AI Timeout / Error handling（`OLLAMA_TIMEOUT_MS` ＋ 全経路フォールバック）
* [x] チームレベルの提案（Home「みんなを誘う」→ `NapProposalSheet` → `/teams/nap-suggestion`。手動・空きスロット非連動）
* [ ] Recommendation persistence（未実装 = RestRecommendation テーブル。P3）
* [ ] `napCutoffHour`（設定値）を `decideRestTiming` に反映（P3）
* [ ] 空きスロット連動の**自動**チーム提案（現状は手動のみ）

---

# 17. Documentation

`docs/` を確認する（実ファイル名）。

* [x] `docs/architecture.md`（PR #42 で追加。入口）
* [x] `docs/setup.md`
* [x] `docs/db.md`
* [x] `docs/auth.md`
* [x] `docs/team-feature.md`
* [x] `docs/settings-architecture.md`
* [x] `docs/testing-guide.md`
* [x] `docs/device-testing.md`（PR #45 で追加。実機・複数アカウント）
* [x] `docs/test-account.md`
* [x] `docs/ai-development.md`
* [x] `docs/implementation-checklist.md`（本ファイル）

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

* [x] Team作成（`POST /teams`）
* [x] Team参加（`POST /teams/join`）
* [x] Member一覧（`/home/member-status` / `/settings/team`）
* [x] メンバーのライブ在席（WebSocket `/api/v1/realtime`）
* [x] メンバー管理（owner のみ、`DELETE /teams/members/:id`）
* [x] 招待リンク共有（deep link）
* [x] Wake / Rest ナッジ（`/teams/members/:id/{wake,rest}`）
* [x] チーム仮眠提案（`/teams/nap-suggestion`。手動）
* [x] メンバーの選択アイコン表示（全ロースターに `avatar` を通す。PR #40）
* [ ] Team平均 / サマリー（**静的スナップショット** = 要 DB 化。P2）
* [ ] Rest ranking（**静的ダミー**、実メンバーと無関係 = 要 DB 化。P2）
* [ ] Team notification の永続化（現状インメモリ。P2）

---

# 21. Stats

* [x] Rest history（`/naps/history`）
* [x] Rest score（個人 = `NapRecord` 由来の実データ）
* [x] Weekly summary（今週 = 日曜〜土曜、`calendarWeek`）
* [x] 今週のコンディション折れ線（未来の日はプロットしない。PR #36）
* [ ] Recommendation acceptance（未実装 = RestRecommendation。P3）
* [ ] チーム統計（**ゼロ埋め** = 要 per-member 集計。P2）

---

# 22. Security / Configuration

* [x] `.env` がGit管理されていない（`.env.example` のみ commit）
* [x] Password / SecretがSource CodeにHardcodeされていない（seed の dev 資格情報のみ）
* [x] Backend Input Validation（zod）が全 mutating route にある
* [x] エラーメッセージが日本語で統一されている（`HttpError` + zod）
* [x] DBへMobileから直接接続できない（必ず `/api/v1` 経由）
* [x] LLMへMobileから直接接続できない（`ai.service` 経由）
* [ ] **CORS が `cors()` 全開放**（allowlist 未設定。P2）
* [ ] **`helmet` なし / `/auth/login` に rate-limit なし**（P2）
* [ ] `ensureUser` / `DEV_USER_ID` フォールバックの削除（現行経路では未到達。P3）
* [ ] Production 時の HTTPS 対応予定を Document 化

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
[Infra] GitHub Actions CI（backend tsc/test + mobile tsc、PR 必須化）
[Backend] チームサマリー / ランキング / チームスコアを NapRecord 由来の実データに
[Backend] 通知フィードを Postgres に永続化（Notification モデル + migration）
[Backend/Sec] helmet + CORS allowlist + /auth/login rate-limit
[Mobile+Backend] Expo Push 通知（トークン登録 + サーバ送信）
[Backend] チーム仮眠提案の自動化（空きスロット + overdue 判定 + fan-out）
[Mobile] 実機でスワイプ / ナビゲーション挙動を検証（expo-router パッチ更新後）
```

> 済：expo-doctor 3 失敗（#43/#46）、Ollama モデル実在タグ + 全経路フォールバック
> + end-to-end 検証（#44/#47）、`docs/architecture.md` / `docs/device-testing.md`（#42/#45）。

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
