# Team Nap データベース設計

## 1. 概要

Team Napでは、ユーザー・チーム・（将来的に）スケジュールや休息履歴などを
保存するために **PostgreSQL** を使用します。

ORMには **Prisma 7** を使用し、Backend API からのみデータベースへアクセスします。
Prisma 7 では接続にドライバアダプタ（`@prisma/adapter-pg`）を用います。

```text
Mobile App
   |
   | REST API / JSON
   v
Backend API  ──(Prisma 7 + @prisma/adapter-pg)──▶  PostgreSQL
```

Mobile App から PostgreSQL へ直接アクセスすることはありません。

> **実装状況（2026-09時点）**
> 実際にDBへ永続化しているのは
> **User / Team / TeamMembership / Session / PasswordResetToken /
> Onboarding / NapRecord** の7モデルです（マイグレーション
> `20260830091652_team_feature` / `20260831095742_auth_sessions` /
> `20260901163406_password_reset_tokens` / `20260901163741_onboarding_profile`
> / `20260901195734_nap_records` /
> `20260901210222_nap_records_allow_multiple_per_day`）。
> `Session` は認証トークン、`PasswordResetToken` はパスワード再設定用の
> 単回・短命トークン、`Onboarding` はサインアップ直後に集める初期設定、
> `NapRecord` は仮眠の記録＋その時に生成した `aiAdvice`（`src/services/`）。
> スケジュール・睡眠設定・休息提案などは、まだ各 `src/services/*` の
> インメモリ状態で持っており、本ドキュメントの後半では「今後の予定」として扱います。

---

## 2. 使用技術

| 項目          | 技術                                    |
| ------------- | -------------------------------------- |
| Database      | PostgreSQL 17                          |
| ORM           | Prisma 7（`prisma` / `@prisma/client`）  |
| Driver Adapter| `@prisma/adapter-pg`（`pg` 8 系）        |
| Backend       | Node.js 22 + Express 5 + TypeScript     |
| Container     | Docker / Docker Compose                 |
| Migration     | Prisma Migrate                          |

---

## 3. 関連ファイル

Databaseに関する主要ファイルは以下です。

```text
backend/
├── prisma/
│   ├── schema.prisma          モデル定義
│   ├── seed.ts                開発用シードデータ
│   └── migrations/            Prisma Migrate 生成物（Git管理）
│       ├── migration_lock.toml
│       └── 20260830091652_team_feature/
│           └── migration.sql
├── prisma.config.ts           Prisma CLI 設定（schema/migrations/seed/datasource）
├── src/
│   └── lib/
│       └── prisma.ts          共有 Prisma Client（driver adapter で初期化）
└── .env                       DATABASE_URL など（Git管理外）
```

### `backend/prisma/schema.prisma`

データベースのモデル定義を記述します。Prisma 7 では接続URLは schema には
書かず、`prisma.config.ts` の `datasource.url`（`DATABASE_URL`）で渡します。

### `backend/prisma/migrations/`

Prisma Migrateによって生成されたMigrationを保存します。**Gitで管理します。**

### `backend/prisma/seed.ts`

開発用のユーザー・チームに加え、`sample@teamnap.app`（サンプル 太郎）へ
**今週＋先週の `NapRecord`**（`aiAdvice` 込み、日付は実行時の週に合わせて生成、
再実行可）を投入します（`npm run db:seed`）。統計・仮眠履歴・コンディション
グラフをすぐ確認するための唯一のシード済みアカウントです。
`prisma.config.ts` の `migrations.seed` にも登録されているため
`prisma migrate reset` 時にも実行されます。

### `backend/prisma.config.ts`

Prisma CLIの設定ファイルです。先頭で `import "dotenv/config"` して `.env` を
読み込み、`schema` / `migrations.path` / `migrations.seed` / `datasource.url`
を指定します。

### `backend/src/lib/prisma.ts`

Backend内で共有する Prisma Client を初期化します。
`new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })`。
`tsx watch` のホットリロードで接続プールが増えないよう `globalThis` にキャッシュします。

---

## 4. ER図

### 4.1 現在実装済み

```mermaid
erDiagram

    USER ||--o{ TEAM_MEMBERSHIP : has
    TEAM ||--o{ TEAM_MEMBERSHIP : has
    USER ||--o{ NAP_RECORD : records

    USER {
        string id PK
        string email UK
        string name "nullable"
        datetime createdAt
    }

    TEAM {
        string id PK
        string name
        string inviteCode UK
        datetime createdAt
    }

    TEAM_MEMBERSHIP {
        string id PK
        string teamId FK
        string userId FK "unique（1ユーザー1チーム）"
        enum   activity "online | resting"
        boolean wakeAssistEnabled
        datetime joinedAt
    }

    NAP_RECORD {
        string id PK
        string userId FK "unique（userId, date）"
        string date "YYYY-MM-DD"
        string start "HH:MM"
        string end "HH:MM"
        int minutes
        int wakeStars
        int focusDeltaPt
        string aiAdvice "nullable"
        datetime createdAt
    }
```

### 4.2 今後の予定（未実装）

```mermaid
erDiagram

    USER ||--o{ SCHEDULE : has
    USER ||--|| SLEEP_SETTING : has
    USER ||--o{ REST_RECOMMENDATION : receives

    SCHEDULE {
        string id PK
        string userId FK
        string title
        datetime startTime
        datetime endTime
        string source
    }

    SLEEP_SETTING {
        string userId PK
        datetime sleepTime
        datetime wakeTime
    }

    REST_RECOMMENDATION {
        string id PK
        string userId FK
        string type
        int durationMinutes
        string reasonCode
        boolean accepted
        datetime createdAt
    }
```

---

## 5. テーブル概要

### 5.1 実装済み

#### User

ユーザーの基本情報を保存します。

| 列           | 型         | 備考                    |
| ------------ | ---------- | ----------------------- |
| id           | String PK  | `uuid()`                |
| email        | String     | `@unique`（保存時に小文字化）|
| name         | String?    | 表示名（頭文字生成に使用）|
| passwordHash | String?    | scrypt ハッシュ `scrypt$<salt>$<hash>`。シード / 旧 `ensureUser` 経由のユーザーは null |
| createdAt    | DateTime   | `now()`                 |

`POST /api/v1/auth/signup` / `login` でパスワード付きユーザーを作成します
（`src/services/auth.service.ts`）。`authenticate` の後ろに無いルート
（home / schedule など）では、`X-User-Id` ヘッダで来た未知のユーザーを
`team.service.ts` の `ensureUser()` が `email = "<userId>@dev.local"` で
`upsert` します（保険）。

#### Session

発行済みの認証トークン。生トークンはクライアントに一度だけ返し、DB には
SHA-256 ハッシュのみ保存します（`src/services/session.service.ts`）。

| 列         | 型         | 備考                                         |
| ---------- | ---------- | -------------------------------------------- |
| id         | String PK  | `uuid()`                                     |
| userId     | String FK  | `onDelete: Cascade`。`@@index([userId])`       |
| tokenHash  | String     | `@unique`。`sha256(token)` の hex             |
| userAgent  | String?    | ログイン時の UA（255 文字で切り詰め）           |
| createdAt  | DateTime   | `now()`                                      |
| lastUsedAt | DateTime   | `authenticate` が毎リクエストで best-effort 更新 |
| expiresAt  | DateTime   | `now() + SESSION_TTL_HOURS`（既定 30 日）      |
| revokedAt  | DateTime?  | logout / logout-others / セッション削除で設定   |

`authenticate` は `tokenHash` で引き、`revokedAt == null` かつ未期限切れの
ものだけを有効とみなします。

#### PasswordResetToken

「パスワードを忘れた」フロー用の単回・短命トークン
（`src/services/password-reset.service.ts`）。`Session` と同様、生トークンは
返さず SHA-256 ハッシュのみ保存。

| 列        | 型         | 備考                                            |
| --------- | ---------- | ---------------------------------------------- |
| id        | String PK  | `uuid()`                                       |
| userId    | String FK  | `onDelete: Cascade`。`@@index([userId])`         |
| tokenHash | String     | `@unique`。`sha256(token)` の hex               |
| expiresAt | DateTime   | `now() + PASSWORD_RESET_TTL_MINUTES`（既定 60分）|
| usedAt    | DateTime?  | 使用時に設定。再発行時は既存の未使用分も used 扱い |
| createdAt | DateTime   | `now()`                                        |

`confirm` 成功時にパスワードを更新し、そのユーザーの **全セッションを失効**
させます。`request` は該当メールが無くても常に 202 を返します（存在秘匿）。

#### Onboarding

ユーザー 1 人につき 1 行（`userId` が PK）。サインアップ直後の初期設定
（睡眠リズム＋カレンダー/通知のオプトイン）を保持します
（`src/services/onboarding.service.ts`）。

| 列                   | 型         | 備考                                   |
| -------------------- | ---------- | ------------------------------------- |
| userId               | String PK  | `onDelete: Cascade`                    |
| bedtime              | String     | `HH:MM`（既定 `23:30`）                 |
| wakeTime             | String     | `HH:MM`（既定 `07:30`）                 |
| calendarConnected    | Boolean    | 既定 `false`                           |
| notificationsEnabled | Boolean    | 既定 `false`                           |
| completedAt          | DateTime?  | オンボーディング完了時に一度だけ設定     |
| updatedAt            | DateTime   | `@updatedAt`                          |

行はサインアップ時にデフォルトで作成し、**それ以前のユーザーには
`GET /api/v1/onboarding` が遅延作成**します。`completedAt == null`
＝「アカウント作成後、まだオンボーディング質問を通していない」。
想定シーケンス: `signup`/`login` → `GET /onboarding` → 未完了なら質問 →
`POST /onboarding/complete` → ホーム。

#### NapRecord

1 回の仮眠につき 1 行（**同じ日に複数回**記録できます）。仮眠時間・目覚めの
評価・仮眠前後の集中度差に加えて、そのとき生成した
**AI アドバイス本文（`aiAdvice`）** を保存します
（`src/services/naps.service.ts`）。統計・スケジュール・ふりかえり画面は
すべてこのテーブルの認証ユーザー分を参照します。

| 列           | 型         | 備考                                                    |
| ------------ | ---------- | ------------------------------------------------------ |
| id           | String PK  | `uuid()`                                               |
| userId       | String FK  | `onDelete: Cascade`。`@@index([userId, date])`          |
| date         | String     | `YYYY-MM-DD`                                           |
| start        | String     | `HH:MM`                                                |
| end          | String     | `HH:MM`                                                |
| minutes      | Int        | 仮眠の実測分数                                          |
| wakeStars    | Int        | 目覚めの良さ（0〜5、既定 `0`）                          |
| focusDeltaPt | Int        | 仮眠前後の集中度差（ポイント、既定 `0`）                |
| aiAdvice     | String?    | 生成した振り返りアドバイス本文（AI 差し替え時もこの列） |
| createdAt    | DateTime   | `now()`                                                |

インデックス: `@@index([userId, date])`。1 日 1 件などの制約はありません
（1 日に何度でも記録可）。

記録フロー: 休憩タイマー終了 → 評価画面で `POST /api/v1/naps`
（`wakeStars` + `focusDeltaPt` を含む）→ サービス層が
`nap-advice.service.ts` の `buildAdvice()` で `aiAdvice` を生成して保存
→ ふりかえり画面が `GET /api/v1/naps/:id` で本文を読み出す。履歴・統計の
各行の矢印も同じ `GET /naps/:id` を開きます。`buildAdvice()` は現状
ルールベースで、後で Ollama 等の実 AI 呼び出しに差し替えても
列・シグネチャは変えずに済む構造です。

#### Team

チーム情報と招待コードを保存します。

| 列         | 型         | 備考                                          |
| ---------- | ---------- | --------------------------------------------- |
| id         | String PK  | `uuid()`                                      |
| name       | String     | 1〜50 文字（zod で検証）                        |
| inviteCode | String     | `@unique`。`NAP-1000`〜`NAP-9999` 形式で採番    |
| createdAt  | DateTime   | `now()`                                       |

招待コードの照合は大文字小文字・ハイフンを無視します
（`normalizeCode()`。`NAP-4821` と `nap4821` は同一扱い）。

#### TeamMembership

User と Team を関連付ける中間テーブルです（旧称 `TeamMember`）。

| 列                | 型                    | 備考                                  |
| ----------------- | --------------------- | ------------------------------------- |
| id                | String PK             | `uuid()`                              |
| teamId            | String FK             | `onDelete: Cascade`                   |
| userId            | String FK             | `onDelete: Cascade`                   |
| activity          | MemberActivity enum   | `online` \| `resting`（既定 `online`） |
| wakeAssistEnabled | Boolean               | 既定 `true`。起床サポート ON/OFF       |
| joinedAt          | DateTime              | `now()`                               |

制約:

```text
@@unique([teamId, userId])   同じチームへの重複参加を防ぐ
@@unique([userId])           1ユーザーは同時に1チームのみ（サービス層でも二重チェック）
```

`role` 列は現状ありません（作成者と参加者を区別していません）。

`activity` は API 上は `MemberStatus`（`working` / `resting` / `offline`）へ
写像されますが、DB に `offline` は存在しません（`mapActivity()`）。

### 5.2 今後の予定

Schedule / SleepSetting / RestRecommendation は未実装です
（仮眠の記録自体は `NapRecord` として実装済み。「5.1 実装済み」参照）。
想定項目は「4.2 今後の予定」ER図および過去版の記述を参照してください。
`source` は `manual | google_calendar | apple_calendar`、`reasonCode` は
`LOW_SLEEP | LONG_WORK_PERIOD | FREE_TIME_AVAILABLE | HIGH_FATIGUE` を想定します。

---

## 6. Prisma Schema（現状）

`backend/prisma/schema.prisma` の実物です。

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // 接続URL(DATABASE_URL)は prisma.config.ts の datasource.url で渡す
}

model User {
  id                  String               @id @default(uuid())
  email               String               @unique
  name                String?
  passwordHash        String?
  createdAt           DateTime             @default(now())
  memberships         TeamMembership[]
  sessions            Session[]
  passwordResetTokens PasswordResetToken[]
  onboarding          Onboarding?
  naps                NapRecord[]
}

model NapRecord {
  id           String   @id @default(uuid())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  date         String   // "YYYY-MM-DD"
  start        String   // "HH:MM"
  end          String   // "HH:MM"
  minutes      Int
  wakeStars    Int      @default(0)
  focusDeltaPt Int      @default(0)
  aiAdvice     String?
  createdAt    DateTime @default(now())

  @@index([userId, date])
}

model Onboarding {
  userId               String    @id
  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  bedtime              String    @default("23:30")
  wakeTime             String    @default("07:30")
  calendarConnected    Boolean   @default(false)
  notificationsEnabled Boolean   @default(false)
  completedAt          DateTime?
  updatedAt            DateTime  @updatedAt
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}

model Session {
  id         String    @id @default(uuid())
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId     String
  tokenHash  String    @unique
  userAgent  String?
  createdAt  DateTime  @default(now())
  lastUsedAt DateTime  @default(now())
  expiresAt  DateTime
  revokedAt  DateTime?

  @@index([userId])
}

model Team {
  id         String           @id @default(uuid())
  name       String
  inviteCode String           @unique
  createdAt  DateTime         @default(now())
  members    TeamMembership[]
}

enum MemberActivity {
  online
  resting
}

model TeamMembership {
  id                String         @id @default(uuid())
  team              Team           @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId            String
  user              User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId            String
  activity          MemberActivity @default(online)
  wakeAssistEnabled Boolean        @default(true)
  joinedAt          DateTime       @default(now())

  @@unique([teamId, userId])
  @@unique([userId])
}
```

### 今後追加する場合の例

`User` にリレーションを足しつつ、以下のようなモデルを段階的に追加します。

```prisma
model Schedule {
  id        String   @id @default(uuid())
  userId    String
  title     String
  startTime DateTime
  endTime   DateTime
  source    String   @default("manual")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model SleepSetting {
  userId    String   @id
  sleepTime DateTime
  wakeTime  DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model RestSession {
  id        String    @id @default(uuid())
  userId    String
  type      String
  startTime DateTime
  endTime   DateTime?
  completed Boolean   @default(false)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model RestRecommendation {
  id              String   @id @default(uuid())
  userId          String
  type            String
  durationMinutes Int
  reasonCode      String
  accepted        Boolean?
  createdAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 7. 環境変数

Database接続情報は環境変数で管理します。`backend/src/config/env.ts` で
zod により検証され、**`DATABASE_URL` は必須**です（未設定だと起動時に終了）。

| 変数           | 必須 | 例 / 既定                                                     | 用途 |
| -------------- | ---- | ----------------------------------------------------------- | ---- |
| `DATABASE_URL` | ✅   | `postgresql://teamnap:teamnap_dev@localhost:5432/teamnap`   | Prisma 接続。Compose 内では host が `db` |
| `DEV_USER_ID`  |      | `00000000-0000-0000-0000-000000000001`                      | `X-User-Id` 未指定時の呼び出しユーザー。`seed.ts` の開発ユーザーと一致 |
| `PORT`         |      | `3000`                                                      | |
| `HOST`         |      | `0.0.0.0`                                                   | |
| `NODE_ENV`     |      | `development`                                               | `production` 時は Prisma Client を `globalThis` にキャッシュしない |

`.env` はGitにcommitしません（`backend/.gitignore` で除外済み）。
`prisma.config.ts` は `import "dotenv/config"` で `backend/.env` を読み込みます。

---

## 8. Docker Compose

`compose.yaml`（Repository root）で PostgreSQL・Backend・Ollama を起動します。
DBサービスの定義は以下のとおりです。

```yaml
services:
  db:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_DB: teamnap
      POSTGRES_USER: teamnap
      POSTGRES_PASSWORD: teamnap_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U teamnap -d teamnap"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

`backend` サービスは `db` の healthcheck が通ってから起動し、
コンテナ起動時に `npm start`（＝ `prisma migrate deploy && node dist/server.js`）で
未適用のマイグレーションを自動適用します。**シードは自動実行されません。**

```bash
docker compose up -d --build          # 全サービス起動（初回のみ --build）
docker compose ps                     # 状態確認
docker compose exec backend npm run db:seed   # 開発データ投入（必要時）
docker compose down                   # 停止（postgres_data は残る）
```

---

## 9. Prisma基本操作

Backend directory で実行します。`package.json` に npm scripts を用意しています。

```bash
cd backend
```

| コマンド              | 実体                          | 用途 |
| -------------------- | ----------------------------- | ---- |
| `npm run db:generate`| `prisma generate`             | Prisma Client 生成 |
| `npm run db:migrate` | `prisma migrate dev`          | スキーマ変更 → マイグレーション作成 + 適用（開発） |
| `npm run db:seed`    | `tsx prisma/seed.ts`          | 開発用シード投入 |
| `npm run db:reset`   | `prisma migrate reset`        | DB を落として作り直し + シード |
| `npm run db:studio`  | `prisma studio`               | GUI でデータ閲覧 |

その他:

```bash
npx prisma validate       # schema の構文チェック
npx prisma migrate deploy # 未適用マイグレーションの適用（本番 / npm start が内部で実行）
```

---

## 10. Migration運用ルール

Migration fileはGitで管理します（`backend/prisma/migrations/`）。

```text
schema.prisma を変更
        ↓
npm run db:migrate  （--name <migration-name> を付ける）
        ↓
prisma/migrations/<timestamp>_<name>/ が生成される
        ↓
git add backend/prisma && git commit
```

- 開発環境: `npm run db:migrate`（= `prisma migrate dev`）
- 本番 / Compose: `prisma migrate deploy`（`npm start` が内部で実行）

現在のマイグレーション:

```text
20260830091652_team_feature           User / Team / TeamMembership / MemberActivity を作成
20260831095742_auth_sessions          User.passwordHash 追加 + Session テーブル
20260901163406_password_reset_tokens  PasswordResetToken テーブル
20260901163741_onboarding_profile     Onboarding テーブル
20260901195734_nap_records            NapRecord テーブル
20260901210222_nap_records_allow_multiple_per_day  NapRecord の (userId, date) UNIQUE を撤去
```

---

## 11. Gitで管理するもの

commitする:

```text
backend/prisma/schema.prisma
backend/prisma/migrations/
backend/prisma/seed.ts
backend/prisma.config.ts
backend/.env.example
backend/package.json
backend/package-lock.json
```

commitしない:

```text
backend/node_modules/
backend/dist/
backend/.env
backend/src/generated/prisma
```

---

## 12. 実装範囲と優先順位

実装済み:

```text
User               （email + passwordHash）
Session            （サインアップ / ログイン / セッション管理 / logout）
PasswordResetToken （パスワード再設定 / 変更）
Onboarding         （初期設定・完了フラグ）
NapRecord          （仮眠の記録 + 生成した AI アドバイス）
Team
TeamMembership     （チーム作成 / 参加 / 離脱 / 改名 / 在席ステータス）
```

`/health` と `/auth`（signup / login / password-reset）以外の
**全 `/api/v1` ルートが `authenticate` 必須**（`routes/index.ts` で一括）。
呼び出しユーザーは常にセッションの `userId`。

次に追加を検討:

```text
Schedule
  ↓
SleepSetting
  ↓
RestRecommendation
```

現在インメモリで動いていて、DB化の候補になっている機能:

```text
settings.service   アカウント / 通知トグル / 睡眠スケジュール / カレンダー連携
schedule.service   予定・当日スケジュール
notifications.service  通知フィード（userId ごとの Map。ナッジ・参加通知の宛先）
team.service       今週の Team Nap サマリー / ランキング（静的スナップショット）
```

---

## 13. 設計方針

- MobileからDatabaseへ直接アクセスしない。操作はBackend API経由。
- Prisma Clientは `src/lib/prisma.ts` で共通化する。
- MigrationはGitで管理する。`.env` やパスワードはcommitしない。
- Foreign Key と `onDelete: Cascade` で関係を明確にする。
- MVPでは必要最小限のSchemaから開始し、Migrationで段階的に拡張する。
- 「1ユーザー1チーム」など重要な不変条件はDB制約とサービス層の両方で担保する。

---

## 14. 今後追加を検討するデータ

```text
UserPreference / Notification（永続化）/ RestFeedback
DeviceUsage / CalendarConnection / TeamNotification / RestScoreHistory
```

Hackathonの初期MVPでは必要なデータだけを実装し、過度に複雑なSchemaは作らない方針です。
