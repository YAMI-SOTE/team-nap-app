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
| llama.cpp + Gemma 3 1B | **Ollama**。既定モデル `gemma4:e2b`（日本語重視。~8GB/2CPU 必要。軽量にするなら `gemma3:1b`）。`OLLAMA_URL` / `OLLAMA_MODEL` / `OLLAMA_TIMEOUT_MS`（既定 60s）、`callGemma` は `keep_alive:"30m"`。`backend/src/services/ai.service.ts` に集約。`llm/` は `llm.md` ＋ `prompts/{personal,team}.txt` のみ |

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
- **AI（Ollama）が実際に生成する状態に**（PR #44 / #47、既定モデルは後日 `gemma4:e2b` へ）
  - 既定モデルを `gemma4:e2b`（日本語重視・~8GB/2CPU）に。RAM が足りないホストは `OLLAMA_MODEL=gemma3:1b`
  - `callGemma` に `keep_alive:"30m"`、`OLLAMA_TIMEOUT_MS`（既定 60s）を env 化
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
| P3 | 既定 `gemma4:e2b` は ollama サービスに ~8GB RAM / 2CPU 必要。足りないホストは `OLLAMA_MODEL=gemma3:1b`（日本語はやや粗い）で運用 |

### 追加で洗い出したタスク（本チェックオフで発見）

| 優先 | 項目 | メモ |
| --- | --- | --- |
| P2 | メンバー詳細の「仮眠の状況 / あと◯分」カードが常に出ない | `member.service.getMemberDetail` の `nap` が常に `null`。ライブ仮眠セッションのモデルが無い |
| P2 | 在席に本当の "offline" が無い | `MemberActivity` は `online`/`resting` のみ。`mapActivity` が全部 `working` に潰す。`lastSeenAt` を足して N 分無応答→offline |
| P2 | チームの空きスロット交差計算が無い | `getNextFreeSlot` は「呼び出しユーザーの次の空き＋その枠に空いているメンバー数」まで。全員共通の空き時間＝自動チーム提案の前提 |
| P3 | `(dev)/ai-test` 画面が本番バンドルに入る | `__DEV__` ガード、または production ビルドから除外 |
| P3 | `sanitizeModelOutput` が接頭辞リークを除去しない | モデルが「【コメント】…」を付けることがある。`^【.*?】` を strip |
| P3 | Home の AI がコールドモデルで最大 30 秒待つ | `GET /home/summary` が初回だけ遅い。呼び出し口ごとにタイムアウトを変える or 起動時ウォームアップ |
| P3 | mobile 側のテストが無い | `mobile/` に test runner 未設定 |
| P3 | WebSocket 在席が単一プロセス前提 | `realtime/hub.ts` の状態はメモリ。複数インスタンス／再起動で消える（現状 1 インスタンス運用なら可） |
| P3 | `helmet` 導入時に CSP / HSTS を検討 | HTTPS 化とセットで |

---

# 1. Repository Structure

## Root

* [x] `README.md` が存在する
* [~] `LICENSE` が存在する（**0 バイト＝空**。P3）
* [x] `.gitignore` が存在する
* [x] `.env.example` が存在する（root は per-package へのポインタ、実体は `backend/` `mobile/`）
* [x] `compose.yaml` が存在する
* [x] `docs/` が存在する（11 ファイル）
* [x] `mobile/` が存在する
* [x] `backend/` が存在する
* [x] `llm/` が存在する（`llm.md` + `prompts/`）

## 不要ファイル確認

* [x] `node_modules/` がGit管理されていない
* [x] `dist/` がGit管理されていない
* [x] `.env` がGit管理されていない（`*.env.example` のみ）
* [x] `.expo/` がGit管理されていない
* [x] `.gguf` Model fileがGit管理されていない
* [x] TypeScriptの生成済み `.js` が `src/` 内に残っていない
* [x] `.d.ts` / `.map` など不要なBuild Outputが `src/` に残っていない（`express.d.ts` は手書き宣言）
* [x] Repository root に不要な `package.json` / `package-lock.json` が無い

---

# 2. Git / GitHub

* [x] `main` branch が正常に存在する（統合先は `develop` → `main`）
* [x] 不要な大量変更がGit Statusに表示されていない
* [x] `.gitignore` がRootから各Projectに正しく適用されている（root + `backend/` + `mobile/`）
* [x] `package-lock.json` がMobile / BackendともにGit管理されている
* [x] `backend/prisma/migrations/` がGit管理されている（10 migrations + `migration_lock.toml`）
* [x] Issueベース／PR ベースで作業できる状態（本セッションで #41〜#49）
* [x] Feature branchを使用できる状態になっている
* [ ] **GitHub Actions CI が無い**（PR ごとの backend `tsc`/`test`・mobile `tsc`。P2）

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

* [x] `mobile/package.json` が存在する
* [x] `mobile/package-lock.json` が存在する
* [x] `mobile/app.json` が存在する（`splash` は `expo-splash-screen` プラグイン config）
* [x] `mobile/tsconfig.json` が存在する（`expo/tsconfig.base` 継承、`@/*` パス）
* [x] `mobile/src/app/` が存在する
* [x] Expo Router が正常に導入されている（SDK 57 / expo-router `~57.0.18`）

## Dependency

* [x] `npm install` が成功する
* [x] `npx expo-doctor` → **21/21 pass**（PR #43 / #46 で 3 失敗を解消）
* [x] Expo package の version mismatch なし（SDK 57 のパッチ版に整合）
* [~] `npm audit`：moderate 14 件（transitive）。`--force` は実行しない前提

確認:

```bash
cd mobile
npm install
npx expo-doctor
```

---

## Expo起動

* [x] `npx expo start` が成功する
* [x] Metro Bundlerが起動する（`:8081`）
* [x] iOS Simulatorで起動できる
* [~] 実機（Expo Go）：**要 Expo Go 最新化 + `mobile/.env` を LAN IP に**。手順は [device-testing.md](./device-testing.md)
* [x] Expo Routerで画面遷移できる（タブ + `<TabSwipe>` 横スワイプ、PR #40）
* [x] `EXPO_PUBLIC_API_URL` を `constants/config.ts` が読む（実機は LAN IP／シミュレータは `localhost`）

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

* [x] `app/` はScreen / Routingを担当（薄いラッパで `features/` を呼ぶ）
* [x] 画面本体は `features/<name>/<Name>Screen.tsx` に分離されている
* [x] API処理がScreen内に直接大量記述されていない
* [x] API処理は `services/` に分離されている（`api.ts` + `<feature>.ts` 16 本）
* [x] 再利用UIは `components/`（+ `components/ui/`）に分離されている
* [x] Shared Typeは `types/api.ts` に配置されている
* [x] Theme / Design Tokenは `theme/`（`colors.ts` / `spacing.ts`）に整理されている

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

* [x] `app.ts` がExpress Application構成を担当している
* [x] `server.ts` がServer起動を担当（HTTP + WebSocket を 1 プロセスで）
* [x] Route / Controller / Service が分離されている
* [x] DB処理がRouteに直接記述されていない
* [x] LLM呼び出しがControllerに直接記述されていない（`services/ai.service.ts` に集約）
* [x] `routes/index.ts` で `authenticate` を一括適用（`/health` `/auth` を除く。無認証は 401 を確認済み）

期待するFlow:

```text
Route → validate(zod) → Controller → Service → Prisma / Ollama
```

---

# 6. Backend TypeScript

* [x] `npm run build` が成功する
* [x] Build Outputは `dist/` のみ（`src/` は `.ts` のみ）
* [x] `src/` に `.js` が生成されない
* [x] `src/` に `.d.ts` が生成されない
* [x] NodeNext / ESM構成が統一（`type: module`、tsconfig `NodeNext`）
* [x] Relative importに `.js` extension（NodeNext が強制）
* [x] `npm run typecheck`（`tsc --noEmit`）が通る
* [x] `npm test`（`tsx --test`）が通る（**29 pass / 8 suites**）

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

* [x] Backendが起動する（`npm run dev` / Docker `npm start`）
* [x] `GET /api/v1/health` Endpointが存在する
* [x] 正常なJSONを返す（`{"status":"ok","service":"team-nap-api","timestamp":...}` を確認）

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

* [x] PostgreSQL 17 Containerが `compose.yaml` に定義されている（healthcheck 付き）
* [x] Docker Volumeが設定されている（`postgres_data`）
* [x] Database User / Database NameがEnvironment Variable化（`POSTGRES_DB/USER/PASSWORD`）
* [x] Container再起動後もDataが保持される（ボリューム永続。本セッション中も維持）

確認:

```bash
docker compose up -d
docker compose ps
```

---

# 9. Prisma

## Version

* [x] `prisma` と `@prisma/client` のVersionが一致（ともに `^7.9.1`）
* [x] `@prisma/adapter-pg`（`^7.9.1`）導入済み

確認:

```bash
cd backend
npm list prisma @prisma/client @prisma/adapter-pg
```

---

## Prisma Config

* [x] `backend/prisma.config.ts` が存在する
* [x] `DATABASE_URL` が `prisma.config.ts` の `datasource.url` で渡されている
* [x] `schema.prisma` の `datasource` に `url = env(...)` を書いていない
* [x] `migrations.seed` が登録されている（`tsx prisma/seed.ts`）

---

## Prisma Validation

* [x] Schema Validationが成功する（`The schema ... is valid 🚀`）
* [x] Prisma Client生成が成功する（v7.9.1）

確認:

```bash
cd backend
npx prisma validate
npx prisma generate
```

---

# 10. Database Schema

現行Modelを確認する（`schema.prisma` で全項目確認済み）:

* [x] User（`email` unique / `name?` / `avatar?` / `passwordHash?`）
* [x] Session（bearer token の SHA-256 ハッシュ、`expiresAt` / `revokedAt`）
* [x] PasswordResetToken
* [x] Onboarding（初期設定 ＋ 設定画面の保存先: 睡眠 / 通知 / カレンダー連携状態 + `calendarLastSyncedAt`）
* [x] NapRecord（仮眠記録 ＋ `aiAdvice`）
* [x] CalendarEvent（per-user 予定。`source` = manual / google、`externalId`）
* [x] Team（`inviteCode` / `inviteCodeNormalized` unique）
* [x] TeamMembership（`activity` / `wakeAssistEnabled` / `role`）

次段階（未実装）:

* [ ] RestRecommendation（休息提案の履歴・受諾フラグ。P3）

Relation確認（全て確認済み）:

* [x] User → NapRecord
* [x] User → CalendarEvent
* [x] User → Onboarding（1:1）
* [x] User → Session / PasswordResetToken
* [x] User → TeamMembership
* [x] Team → TeamMembership

制約（全て確認済み）:

* [x] User `email` が Unique
* [x] Onboarding が User ごとに1件（`userId` PK）
* [x] TeamMembership `(teamId, userId)` が Unique ＋ `(userId)` も Unique（1人1チーム）
* [x] CalendarEvent `(userId, externalId)` が Unique
* [x] 主要リレーションの FK に `onDelete: Cascade`

---

# 11. Prisma Migration

* [x] 初期〜最新の 10 Migration が `backend/prisma/migrations/` に存在する
* [x] MigrationがDatabaseへ適用できる（`migrate status` → `Database schema is up to date!`）
* [x] Migration folderがGit管理されている
* [x] `npm run db:seed` が再実行可能（upsert。本セッション中に複数回実行）

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

* [x] `backend/Dockerfile` が存在する（`node:22-alpine`。`.dockerignore` あり）
* [x] `npm ci` が成功する（本セッションでイメージビルド確認）
* [x] `npx prisma generate` がDocker build中に成功する
* [x] `npm run build` がDocker build中に成功する
* [x] `dist/server.js` が存在する
* [x] 起動時に `prisma migrate deploy` が走る（`npm start` = `prisma migrate deploy && node dist/server.js`）

---

## Compose

* [x] Backend Serviceが定義されている
* [x] DB Serviceが定義されている
* [x] Backend → DBのNetwork接続が可能（`DATABASE_URL=...@db:5432`、`depends_on: db healthy`）
* [x] Backend Port `3000` がホスト公開されている（`3000:3000`）
* [!] DB Port `5432` がホスト公開されている（ローカル `npm run dev` には必要。**デプロイでは外す**）
* [x] LLM（Ollama）Service は**定義済み**（`ollama` + `ollama-pull`。稼働確認済み）

確認:

```bash
docker compose up --build
```

---

# 13. Docker Runtime Verification

* [x] Backend ContainerがRunning（`team-nap-app-backend-1` Up）
* [x] DB ContainerがRunning（`team-nap-app-db-1` Up, healthy）
* [x] Ollama ContainerがRunning（`team-nap-app-ollama-1` Up, healthy）
* [x] Backend logsにCrashがない／`curl /api/v1/health` → 200

確認:

```bash
docker compose ps
docker compose logs backend
docker compose logs db
curl http://localhost:3000/api/v1/health
```

---

# 14. Mobile → Backend Connection

* [x] Mobile用API Serviceが存在する（`services/api.ts`。Bearer / `ApiError(0)` / 401 ハンドラ）
* [x] API Base URLを `EXPO_PUBLIC_API_URL` で指定（`constants/config.ts`）。REST も WS も同じ値で切替
* [x] Mobileから `/api/v1/health` 系（`/health/frontend-boot`）を呼ぶ
* [x] SimulatorからBackendへ接続できる（`localhost:3000`）
* [~] 実機：LAN IP 指定で可。ただし **IP は Wi‑Fi/テザリングで変わる**ため都度更新が要る（[device-testing.md](./device-testing.md) §2‑3 / §7、Tailscale で固定可）

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
* [x] モデルタグ：既定 `gemma4:e2b`（日本語重視・~8GB/2CPU）。軽量は `gemma3:1b`
* [x] AIタイムアウト：`callGemma` は `OLLAMA_TIMEOUT_MS`（既定 60s、env 調整可）＋ `keep_alive:"30m"`
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

* [x] Install手順（`backend/` と `mobile/` で別々に `npm install`）
* [x] Mobile起動方法
* [x] Backend起動方法
* [x] Docker起動方法
* [x] Prisma操作方法（`db:migrate` / `db:seed` / `db:reset`）
* [x] Environment Variables（PR #42 で per-package `.env.example` に整合。`OLLAMA_MODEL` も更新）
* [x] Git Workflow

---

# 18. Figma / UI Implementation

Designerとの連携状態を確認する。

* [~] Figma Design：各画面のコンポーネント comment に node 参照あり（例 `Figma "S02-01_Home", node 733:4460`）。共有状況そのものはコード外
* [x] Main Screen：ホーム / スケジュール / チーム / 統計 / 設定 の 5 タブ確定
* [x] Design Token：`theme/colors.ts`（TeamNap 変数）/ `theme/spacing.ts`（`spacing` / `radius`）
* [x] Color … `colors.ts` にトークン化
* [~] Typography … 専用トークン無し。各コンポーネントに fontSize/lineHeight/fontWeight を直書き（Figma 値をコメント）
* [x] Spacing / Border Radius … `spacing.ts`
* [x] Component State … `StatusChip` / `Toggle` / `PillButton` variant などで表現

Figma generated code をそのまま Architecture として使用せず、React Native
Component へ整理する（`mobile/src/components/` / `components/ui/`）。

---

# 19. Core MVP Remaining Tasks

以下を実装状況に応じて分類する。

> §19 は本セッションで API 疎通・コード確認済み。全て **[x]**。

## Authentication

* [x] User registration（`POST /auth/signup`）
* [x] Login（`POST /auth/login`）
* [x] Logout（`POST /auth/logout` + `logout-others`）
* [x] Auth Middleware（`authenticate`、無認証 401 確認）
* [x] Mobile Auth state（`AuthContext` / expo-secure-store）
* [x] Password reset（`/auth/password-reset/{request,confirm}`）

## Schedule

* [x] Schedule List（`GET /schedule/day`）
* [x] Schedule Create（`POST /schedule/events`）
* [x] Schedule Edit（`PUT /schedule/events/:id`）
* [x] Schedule Delete（`DELETE /schedule/events/:id`）
* [x] Schedule API（per-user。他ユーザーの id は 404）
* [x] Schedule DB persistence（`CalendarEvent`。PR #38/#39）
* [x] Google カレンダー取り込み（`/settings/calendar/google/sync`。OAuth なし・サンプル）

## Sleep

* [x] Sleep Setting UI（設定 › 睡眠スケジュール）
* [x] Sleep Setting API（`/settings/sleep-schedule`）
* [x] Sleep Setting persistence（`Onboarding` の `bedtime` / `wakeTime` / `napCutoffHour`）

## Home

* [x] Today's schedule
* [x] Next free time（`getNextFreeSlot`。予定がある日のみ）
* [x] Rest recommendation（`/rest/decision`。ルールエンジン）
* [x] Loading / Empty / Error state
* [x] Solo（チーム未加入）レイアウト（`HomeNoTeamView`）

## Rest

* [x] 15-minute Timer（Start / Pause / Resume / Cancel）
* [x] Completion handling（評価 → ふりかえり）
* [x] Rest Session saving（`POST /naps` → `NapRecord` ＋ `aiAdvice`。Ollama or `buildAdvice`）

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
[Backend] 在席に lastSeenAt を足して "offline" を導出（現状は全部「作業中」）
[Backend] ライブ仮眠セッションのモデル → メンバー詳細の「あと◯分」カード
[Backend] チームの空きスロット交差 → 自動チーム仮眠提案
[Mobile] (dev)/ai-test を __DEV__ ガード。mobile 側の test runner を導入
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

* [x] Mobileが起動する（Metro / tsc。実機は Expo Go 最新化 + LAN IP）
* [x] BackendがBuildできる（`npm run build` / Docker イメージ）
* [x] Docker Composeが起動する（`backend` / `db` / `ollama` 稼働確認）
* [x] PostgreSQLが起動する
* [x] Prisma Validationが通る
* [x] Prisma Clientが生成できる
* [x] `GET /api/v1/health` が正常Responseを返す
* [x] Gitに不要な生成物が含まれていない
* [x] Remaining TasksがPriority付きで整理されている（「直近の対応状況」＋「追加で洗い出したタスク」）
* [x] 次のGitHub Issues候補が明確になっている（§24 D）
