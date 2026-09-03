# Team Nap データベース設計

## 1. 概要

Team Nap は **PostgreSQL** にすべての永続データを保存します。ORM は
**Prisma 7**、接続はドライバアダプタ `@prisma/adapter-pg` 経由。Backend API
からのみアクセスし、Mobile から DB へは直接触れません。

```text
Mobile App
   |
   | REST API / JSON
   v
Backend API  ──(Prisma 7 + @prisma/adapter-pg)──▶  PostgreSQL
```

> **現行モデル（11）**: `User` / `Session` / `PasswordResetToken` /
> `Onboarding` / `NapRecord` / `NapSession` / `CalendarEvent` /
> `Notification` / `PushToken` / `Team` / `TeamMembership` ＋ enum
> `MemberActivity`。マイグレーションは **13 本**（§10）。
>
> 唯一まだ永続化していないのは realtime 在席ハブ（`src/realtime/hub.ts`、
> プロセス内の WebSocket 接続集合）と、休息提案の履歴テーブル
> （`RestRecommendation`、§5.2）です。

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

開発用のユーザー・チーム（詳細は [test-account.md](./test-account.md)）に加え、
`sample@teamnap.app`（サンプル 太郎）へ **今週＋先週の `NapRecord`**（`aiAdvice`
込み、日付は実行時の週に合わせて生成）と当週の `CalendarEvent` を投入します
（`npm run db:seed`、再実行可）。統計・仮眠履歴・コンディショングラフ・
スケジュールをすぐ確認するための唯一のシード済みアカウントです。
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
    USER ||--o| NAP_SESSION : "has (in progress)"
    USER ||--o{ CALENDAR_EVENT : schedules
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ PUSH_TOKEN : "registers"
    USER ||--|| ONBOARDING : has
    USER ||--o{ SESSION : has

    USER {
        string id PK
        string email UK
        string name "nullable"
        string avatar "nullable（cat | man | woman）"
        string passwordHash "nullable"
        datetime createdAt
    }

    TEAM {
        string id PK
        string name
        string inviteCode UK
        string inviteCodeNormalized UK
        datetime createdAt
    }

    TEAM_MEMBERSHIP {
        string id PK
        string teamId FK
        string userId FK "unique（1ユーザー1チーム）"
        enum   activity "online | resting"
        boolean wakeAssistEnabled
        string role "owner | member"
        datetime joinedAt
    }

    ONBOARDING {
        string userId PK
        string bedtime
        string wakeTime
        int napCutoffHour
        boolean calendarConnected
        boolean calendarDeviceConnected
        boolean notificationsEnabled
        boolean notifyNapSuggestion
        boolean notifyNapEnd
        boolean notifyTeamNapSuggestion
        boolean notifyWakeSupport
        datetime calendarLastSyncedAt "nullable"
        datetime completedAt "nullable"
    }

    CALENDAR_EVENT {
        string id PK
        string userId FK "index (userId, date)"
        string title
        string date "YYYY-MM-DD"
        string start "HH:MM"
        string end "HH:MM"
        boolean allDay
        string source "manual | google"
        string externalId "nullable, unique (userId, externalId)"
        datetime createdAt
        datetime updatedAt
    }

    NAP_RECORD {
        string id PK
        string userId FK "index (userId, date)"
        string date "YYYY-MM-DD"
        string start "HH:MM"
        string end "HH:MM"
        int minutes
        int wakeStars
        int focusDeltaPt
        string aiAdvice "nullable"
        datetime createdAt
    }

    NAP_SESSION {
        string id PK
        string userId FK "unique (1 ユーザー最大 1)"
        datetime startedAt
        datetime wakeAt "起床予定 = startedAt + 分数"
        datetime createdAt
    }

    NOTIFICATION {
        string id PK
        string userId FK "index (userId, createdAt)"
        string kind "welcome | wake_request | rest_request | ..."
        string title
        string body
        datetime readAt "nullable = 未読"
        datetime createdAt
    }

    PUSH_TOKEN {
        string id PK
        string userId FK "index (userId)"
        string token UK "ExponentPushToken[...]"
        string platform "nullable (ios | android | web)"
        datetime createdAt
        datetime updatedAt
    }

    SESSION {
        string id PK
        string userId FK
        string tokenHash UK
        datetime expiresAt
        datetime revokedAt "nullable"
    }
```

（`PasswordResetToken` も同様に `USER` に 1:N でぶら下がります。図では省略。）

### 4.2 今後の予定（未実装）

> 睡眠設定は `Onboarding` の列、スケジュールは `CalendarEvent`（4.1）として
> 実装済みのため、専用テーブルは作りません。休息提案の履歴だけが未実装です。

```mermaid
erDiagram

    USER ||--o{ REST_RECOMMENDATION : receives

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
| avatar       | String?    | 選択アイコン ID（`cat` \| `man` \| `woman`。プレースホルダーの候補セット）。null は頭文字フォールバック。`mobile/src/constants/avatars.ts` が単一ソース |
| passwordHash | String?    | scrypt ハッシュ `scrypt$<salt>$<hash>`。シード / 旧 `ensureUser` 経由のユーザーは null |
| createdAt    | DateTime   | `now()`                 |

`POST /api/v1/auth/signup` / `login` でパスワード付きユーザーを作成します
（`src/services/auth.service.ts`）。`/health` と `/auth` 以外の全ルートは
`authenticate` 必須なので、呼び出しユーザーは常にセッションの `userId` です。
`team.service.ts` の `ensureUser()` は旧 `X-User-Id` 経路向けの保険として
残っていますが、現在の経路では到達しません。

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

ユーザー 1 人につき 1 行（`userId` が PK）。サインアップ直後の初期設定に加えて、
**設定画面（睡眠スケジュール / 通知トグル / カレンダー連携）も同じ行を読み書き**
します。オンボーディングと設定で値が食い違わないための単一ソースです
（`src/services/onboarding.service.ts` / `src/services/settings.service.ts`）。

| 列                        | 型         | 備考                                   |
| ------------------------- | ---------- | ------------------------------------- |
| userId                    | String PK  | `onDelete: Cascade`                    |
| bedtime                   | String     | `HH:MM`（既定 `23:30`）                 |
| wakeTime                  | String     | `HH:MM`（既定 `07:30`）                 |
| napCutoffHour             | Int        | 既定 `15`。サーバー所有（編集 UI なし）  |
| calendarConnected         | Boolean    | 既定 `false`。Google カレンダー連携中か（OAuth なし・サンプル取り込み） |
| calendarDeviceConnected   | Boolean    | 既定 `false`。端末カレンダー連携（モック）|
| calendarLastSyncedAt      | DateTime?  | 最後に Google の予定を取り込んだ時刻。未連携で `null` |
| notificationsEnabled      | Boolean    | 既定 `false`。オンボーディングの通知オプトイン |
| notifyNapSuggestion       | Boolean    | 既定 `true`。設定 > 通知「仮眠の提案」    |
| notifyNapEnd              | Boolean    | 既定 `true`。設定 > 通知「仮眠の終了」    |
| notifyTeamNapSuggestion   | Boolean    | 既定 `true`。設定 > 通知「チーム仮眠提案」|
| notifyWakeSupport         | Boolean    | 既定 `true`。設定 > 通知「起床サポート」  |
| completedAt               | DateTime?  | オンボーディング完了時に一度だけ設定     |
| updatedAt                 | DateTime   | `@updatedAt`                          |

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
（`wakeStars` + `focusDeltaPt` を含む）→ サービス層が `generateNapAdvice()`
（Ollama、失敗時 `nap-advice.service.ts` の `buildAdvice()` ルールベース）で
`aiAdvice` を生成して保存 → ふりかえり画面が `GET /api/v1/naps/:id` で本文を
読み出す。履歴・統計の各行の矢印も同じ `GET /naps/:id` を開きます。
`POST /naps` は同時に `NapSession` を削除します（仮眠終了）。

#### NapSession

進行中の仮眠。**1 ユーザー最大 1 行**（`userId` が `@unique`）。teammate の
メンバー詳細画面の「仮眠の状況 / あと◯分」カードのソース
（`src/services/nap-session.service.ts`）。

| 列        | 型         | 備考 |
| --------- | ---------- | ---- |
| id        | String PK  | `uuid()` |
| userId    | String FK  | `@unique`。`onDelete: Cascade` |
| startedAt | DateTime   | 開始時刻（`now()`） |
| wakeAt    | DateTime   | 起床予定 = `startedAt` + タイマーの分数 |
| createdAt | DateTime   | `now()` |

- 休憩タイマーの開始 / 再開で `PUT /api/v1/rest/session { plannedMinutes }`
  が upsert、終了 / キャンセル / 画面離脱 / `POST /naps` で `DELETE` が削除。
- `wakeAt` を 30 分以上過ぎた行は「アプリが落ちて終了できなかった」とみなし、
  次回読み出し時に無視 + 掃除する（`activeNapSession()`）。
- `getMemberDetail` は対象の active セッションから `wakeAt`（JST `HH:MM`）と
  `minutesRemaining` を返す。

#### CalendarEvent

ユーザー 1 人のスケジュール 1 件 1 行（`src/services/schedule.service.ts`）。
スケジュール画面の CRUD（`/api/v1/schedule/events`）と、当日ビュー・空き時間
計算（休息提案 `rest-recommendation.service`／ホームの「次の空き時間」）が
同じ行を読みます。以前は全ユーザー共有のインメモリ配列でした
（`20260903024003_calendar_events` で永続化）。

| 列         | 型         | 備考                                                        |
| ---------- | ---------- | --------------------------------------------------------- |
| id         | String PK  | `uuid()`                                                  |
| userId     | String FK  | `onDelete: Cascade`。`@@index([userId, date])`             |
| title      | String     | 予定名（既定 `""`）                                         |
| date       | String     | `YYYY-MM-DD`（ローカル暦日）                                |
| start      | String     | `HH:MM`                                                    |
| end        | String     | `HH:MM`                                                    |
| allDay     | Boolean    | 既定 `false`。終日予定がある日は空き時間なし扱い            |
| source     | String     | `"manual"`（手入力）/ `"google"`（カレンダー取り込み）。既定 `"manual"` |
| externalId | String?    | 取り込み元の ID。`@@unique([userId, externalId])`。手入力は `null` |
| createdAt  | DateTime   | `now()`                                                    |
| updatedAt  | DateTime   | `@updatedAt`                                               |

Google カレンダー連携: `GoogleAccount` があれば実 OAuth 同期
（`src/services/google-calendar.service.ts`、増分 `syncToken` + `410`→フル）、
無ければ従来のサンプル 1 週間分（`src/services/google-calendar-sample.ts`）を
`source: "google"` として取り込みます。再同期は `externalId` 一致で upsert /
削除（手入力の行は保持）、`POST /settings/calendar/google/disconnect` は
`GoogleAccount` とトークンを削除し `source: "google"` の行を全削除します
（`User.googleId` は残すので Google ログインは継続可）。`sample@teamnap.app`
はシードでサンプル＋手入力 2 件が入り、連携済みの状態になっています。
詳細: [google-integration.md](./google-integration.md)。

#### GoogleAccount

Google と連携したユーザー 1 人につき 1 行（`userId @id`）。OAuth の
アクセス / リフレッシュトークンを **AES-256-GCM で暗号化**して保持
（`src/lib/secret-box.ts`、鍵は `GOOGLE_TOKEN_ENC_KEY`）。生トークンは DB に
入りません。`syncToken`（増分同期）、`watchChannelId` / `watchExpiresAt`
（`events.watch` プッシュチャンネル）、`lastSyncedAt` を持ちます。
`User` 削除で `onDelete: Cascade`。

#### Notification

通知フィード 1 通 = 1 行（`src/services/notifications.service.ts`）。ナッジ・
チーム参加・チーム仮眠提案などが宛先ユーザーの行として積まれ、
`GET /api/v1/notifications` が新しい順に返します。詳細は
[notifications.md](./notifications.md)。

| 列        | 型         | 備考 |
| --------- | ---------- | ---- |
| id        | String PK  | `uuid()` |
| userId    | String FK  | `onDelete: Cascade`。`@@index([userId, createdAt])` |
| kind      | String     | `welcome` / `wake_request` / `rest_request` / `nap_ended` / `weekly_review` / `member_joined` / `team_nap_suggestion` |
| title     | String     | |
| body      | String     | |
| readAt    | DateTime?  | `null` = 未読。`/read` `/read-all` で設定 |
| createdAt | DateTime   | `now()`。相対時刻ラベル（「2分前」）と today / earlier 区分は**読み出し時に導出**（値を凍結しない） |

welcome 通知は初回読み出し時に遅延 seed（冪等）。`addNotification()` は行を
作った後、非同期で Expo プッシュ（`push.service.sendPushToUser`）も投げる。

#### PushToken

ユーザーの各デバイスの Expo プッシュトークン（`src/services/push.service.ts`）。
サインイン後にアプリが `POST /api/v1/notifications/token` で登録し、
`addNotification()` がこのトークンへプッシュを送る。

| 列        | 型         | 備考 |
| --------- | ---------- | ---- |
| id        | String PK  | `uuid()` |
| userId    | String FK  | `onDelete: Cascade`。`@@index([userId])` |
| token     | String     | `@unique`。`ExponentPushToken[...]`。別アカウントで再登録されたら付け替え |
| platform  | String?    | `ios` / `android` / `web` |
| createdAt / updatedAt | DateTime | |

Expo が `DeviceNotRegistered` を返したトークンは次回送信時に削除されます。

#### Team

チーム情報と招待コードを保存します。

| 列                   | 型         | 備考                                          |
| -------------------- | ---------- | --------------------------------------------- |
| id                   | String PK  | `uuid()`                                      |
| name                 | String     | 1〜50 文字（zod で検証）                        |
| inviteCode           | String     | `@unique`。`NAP-1000`〜`NAP-9999` 形式で採番    |
| inviteCodeNormalized | String     | `@unique`。`normalizeCode(inviteCode)`（大文字・英数字のみ）。join はこの列でインデックス検索（全件スキャンを廃止） |
| createdAt            | DateTime   | `now()`                                       |

招待コードの照合は大文字小文字・ハイフンを無視します
（`normalizeCode()`。`NAP-4821` と `nap4821` は同一扱い）。join は
`inviteCodeNormalized` の一意インデックスを直接引きます。

#### TeamMembership

User と Team を関連付ける中間テーブルです（旧称 `TeamMember`）。

| 列                | 型                    | 備考                                  |
| ----------------- | --------------------- | ------------------------------------- |
| id                | String PK             | `uuid()`                              |
| teamId            | String FK             | `onDelete: Cascade`                   |
| userId            | String FK             | `onDelete: Cascade`                   |
| activity          | MemberActivity enum   | `online` \| `resting`（既定 `online`）。realtime hub が変更を全メンバーへ push |
| wakeAssistEnabled | Boolean               | 既定 `true`。起床サポート ON/OFF       |
| role              | String                | `"owner"`（作成者）または `"member"`。メンバー削除はオーナーのみ。オーナー離脱時は最古参メンバーへ委譲 |
| joinedAt          | DateTime              | `now()`                               |

制約:

```text
@@unique([teamId, userId])   同じチームへの重複参加を防ぐ
@@unique([userId])           1ユーザーは同時に1チームのみ（サービス層でも二重チェック）
```

`role` はチーム作成者が `"owner"`、以降の参加者は `"member"`。オーナーだけが
`DELETE /api/v1/teams/members/:id` でメンバーを削除でき、オーナーが離脱すると
最古参メンバーへ自動委譲します。`renameTeam` は現状メンバーなら誰でも可能です。

`activity` は API 上は `MemberStatus`（`working` / `resting` / `offline`）へ
写像されますが、DB に `offline` は存在しません（`mapActivity()`）。

### 5.2 今後の予定

RestRecommendation（休息提案の履歴・受諾フラグ）は未実装です。仮眠の記録は
`NapRecord`、スケジュールは `CalendarEvent`、睡眠設定・通知トグル・カレンダー
連携状態は `Onboarding` の列として実装済み（「5.1 実装済み」参照）。
`reasonCode` は `rest-decision.service.ts` の `RestReasonCode`
（`REST_RECOMMENDED | RECENTLY_RESTED | NO_FREE_TIME | TOO_LATE | NO_REST_NEEDED`）
を想定します。

---

## 6. Prisma Schema

スキーマの実体は `backend/prisma/schema.prisma`（11 モデル + enum
`MemberActivity`）。**このドキュメントに全文コピーは置かない**（drift を避ける）。
各モデルの列と意味は §5、リレーション全体は §4 の ER 図を参照。

### 今後追加する場合の例

`User` にリレーションを足しつつ、休息提案の履歴だけを段階的に追加する想定。
スケジュールは `CalendarEvent`、睡眠設定は `Onboarding` の列、仮眠セッションは
`NapSession` として実装済みなので専用モデルは作らない。

```prisma
model RestRecommendation {
  id              String   @id @default(uuid())
  userId          String
  type            String
  durationMinutes Int
  reasonCode      String   // rest-decision.service の RestReasonCode
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
| `DEV_USER_ID`  |      | `00000000-0000-0000-0000-000000000001`                      | 旧 `X-User-Id` フォールバック用（現在は全ルート `authenticate` 必須のため未使用）。`seed.ts` の開発ユーザー id と一致 |
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

現在のマイグレーション（13）:

```text
20260830091652_team_feature           User / Team / TeamMembership / MemberActivity を作成
20260831095742_auth_sessions          User.passwordHash 追加 + Session テーブル
20260901163406_password_reset_tokens  PasswordResetToken テーブル
20260901163741_onboarding_profile     Onboarding テーブル
20260901195734_nap_records            NapRecord テーブル
20260901210222_nap_records_allow_multiple_per_day  NapRecord の (userId, date) UNIQUE を撤去
20260901222623_onboarding_settings_fields  Onboarding に napCutoffHour / notify* / calendarDeviceConnected を追加
20260901224358_team_roles_and_invite_index  TeamMembership.role + Team.inviteCodeNormalized（一意）
20260902110246_user_avatar            User.avatar 追加（選択アイコン ID、null 可）
20260903024003_calendar_events        CalendarEvent テーブル + Onboarding.calendarLastSyncedAt
20260903093642_notifications_feed     Notification テーブル（通知フィードの永続化）
20260903135854_nap_sessions           NapSession テーブル（進行中の仮眠）
20260903141120_push_tokens            PushToken テーブル（Expo プッシュ）
20260903204140_team_last_seen         TeamMembership.lastSeenAt（オフライン判定）
20260904000000_google_account         User.googleId + GoogleAccount テーブル（Google 連携）
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
User               email + passwordHash（scrypt）
Session            サインアップ / ログイン / セッション管理 / logout
PasswordResetToken パスワード再設定 / 変更
Onboarding         初期設定・完了フラグ ＋ 設定画面の保存先（睡眠 / 通知 / カレンダー連携状態）
NapRecord          仮眠の記録 + 生成した AI アドバイス
NapSession         進行中の仮眠（teammate の「あと◯分」カード）
CalendarEvent      ユーザーごとの予定 CRUD ＋ Google カレンダー取り込み / 空き時間計算
Notification       通知フィード（相対時刻ラベルは読み出し時に導出）
PushToken          Expo プッシュトークン（デバイスごと）
Team               招待コード + 正規化列でインデックス検索
TeamMembership     作成 / 参加 / 離脱 / 改名 / 在席ステータス / role（owner・member）/ メンバー削除 / WS ライブ更新
```

チームサマリー / ランキング / チームスコア / チーム統計は `NapRecord` 由来の
実データ（`services/team-nap-stats.service.ts`）。

次に追加を検討:

```text
RestRecommendation （休息提案の履歴・受諾フラグ。判定ロジック自体は rest-decision.service に存在）
```

まだインメモリなのは realtime 在席ハブ（`src/realtime/hub.ts`）だけ。

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
RestRecommendation（休息提案の履歴・受諾フラグ）
RestScoreHistory  （休息スコアの推移）
RestFeedback      （AI アドバイスへのフィードバック）
```

初期 MVP では必要なデータだけを実装し、過度に複雑な Schema は作らない方針です。
