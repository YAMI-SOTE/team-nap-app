# チーム機能 バックエンド実装ガイド

## 1. 目的

「チーム（Team）」機能のバックエンド側の実装を、どこに何が書かれているか
迷わないように整理する。対象は次の画面・ユースケース。

- チームをつくる / 招待コードで参加する / チームを抜ける
- チーム設定（名前変更、メンバー一覧、招待コード表示）
- 自分の在席ステータス（作業中 / 休憩中）の取得・更新
- メンバー詳細と「起きて」「休んで」のナッジ送信
- 今週の Team Nap サマリー、仮眠上手ランキング（現状は静的スナップショット）

関連ドキュメント: [db.md](./db.md) / [settings-architecture.md](./settings-architecture.md)

---

## 2. 全体像

リクエストの流れは他機能と同じ（`backend/README.md` の Request flow を踏襲）。

```text
[ ルート ]        backend/src/routes/team.routes.ts        URL と HTTP メソッド + validate()
     |                                                     settings.routes.ts にも一部あり
     v
[ コントローラ ]  backend/src/controllers/team.controller.ts   body の受け取りと 200/201 返却のみ
                  backend/src/controllers/member.controller.ts  （ロジックは持たない）
     |
     v
[ サービス ]      backend/src/services/team.service.ts      ドメインロジック本体
                  backend/src/services/member.service.ts    メンバー詳細
                  backend/src/services/nudge.service.ts     ナッジ送信
     |
     | Prisma (@prisma/adapter-pg)
     v
[ DB ]           PostgreSQL   User / Team / TeamMembership
```

- ベース URL は `app.ts` で `/api/v1`、`routes/index.ts` で
  `teamRoutes` を **`/teams`** にマウント。チーム設定・離脱だけは
  `settingsRoutes`（`/settings`）配下にある。
- レスポンスの型は `team.service.ts` の `export type` が契約。
  フロントは `mobile/src/types/api.ts` に同じ形を手で持つ。
- **認証必須**。`teamRoutes` と `settings` の `/team`・`/team/leave` は
  `authenticate` ミドルウェアの後ろにあり、`Authorization: Bearer <token>`
  が要る（未指定/失効で 401）。呼び出しユーザーは `requireUserId(req)`
  ＝ セッションの `userId`（`lib/request-user.ts`）。トークンは
  `POST /api/v1/auth/login` などで取得する。
- 開発時はシードユーザーでログインできる:
  `dev@teamnap.local` / `teamnap-dev`（`npm run db:seed`）。

---

## 3. データモデル（Prisma）

`backend/prisma/schema.prisma` / マイグレーション
`prisma/migrations/20260830091652_team_feature/`。

```prisma
model User {
  id          String           @id @default(uuid())
  email       String           @unique
  name        String?
  createdAt   DateTime         @default(now())
  memberships TeamMembership[]
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
  teamId            String
  userId            String
  activity          MemberActivity @default(online)
  wakeAssistEnabled Boolean        @default(true)
  joinedAt          DateTime       @default(now())

  @@unique([teamId, userId])
  @@unique([userId])   // ← 1 ユーザーは最大 1 チーム
}
```

ポイント。

| 制約 | 意味 |
| --- | --- |
| `TeamMembership.@@unique([userId])` | 1 ユーザーは同時に 1 チームだけ。DB とサービス層の両方で担保。 |
| `Team.inviteCode @unique` | 招待コードは全体で一意。 |
| `onDelete: Cascade`（team / user） | チームまたはユーザー削除で membership も消える。 |
| `activity` は `online \| resting` のみ | 「offline」はモデル化していない。API 上は `working / resting / offline` の `MemberStatus` に写像するが、DB からは `offline` は出ない。 |
| `wakeAssistEnabled` | 起床サポート ON/OFF。OFF のメンバーへの wake ナッジは 409。 |

Prisma クライアントは `src/lib/prisma.ts` の共有シングルトン（Prisma 7 +
`@prisma/adapter-pg`、接続 URL は `env.DATABASE_URL`）。

---

## 4. エンドポイント一覧

すべて `/api/v1` 配下。バリデーションは `routes/*.routes.ts` の
`validate({ body })`（zod スキーマは `schemas/team.schema.ts`）。

### 4.1 `/teams`（`routes/team.routes.ts`）

| メソッド / パス | body | 成功 | サービス | 返却型 |
| --- | --- | --- | --- | --- |
| `GET /teams/summary` | – | 200 | `getTeamSummary` | `TeamSummaryResponse \| null` |
| `GET /teams/ranking` | – | 200 | `getTeamRanking` | `TeamRankingResponse \| null` |
| `POST /teams` | `{ name }` | **201** | `createTeam` | `TeamSettingsResponse` |
| `PUT /teams` | `{ name }` | 200 | `renameTeam` | `TeamSettingsResponse` |
| `POST /teams/join` | `{ inviteCode }` | 200 | `joinTeam` | `TeamSettingsResponse` |
| `GET /teams/me/status` | – | 200 | `getMyStatus` | `{ status: MemberStatus }` |
| `PUT /teams/me/status` | `{ status: "online" \| "resting" }` | 200 | `setActivity` | `TeamSettingsResponse` |
| `GET /teams/members/:id` | – | 200 / 404 | `getMemberDetail` | `MemberDetailResponse` |
| `POST /teams/members/:id/wake` | – | 200 | `sendNudge(…, "wake")` | `{ success: true }` |
| `POST /teams/members/:id/rest` | – | 200 | `sendNudge(…, "rest")` | `{ success: true }` |

### 4.2 `/settings/team`（`routes/settings.routes.ts`）

| メソッド / パス | body | 成功 | サービス | 返却型 |
| --- | --- | --- | --- | --- |
| `GET /settings/team` | – | 200 | `settings.service.getTeamSettings` → `team.service.getCurrentTeam` | `TeamSettingsResponse \| null` |
| `POST /settings/team/leave` | – | 200 | `settings.service.leaveTeam` → `team.service.leaveTeam` | `{ success: true }` |

`null` は「まだチームに入っていない」を表し、フロントは空状態
（`NoTeamScreen`）を出す。

### 4.3 バリデーション（`schemas/team.schema.ts`）

- `name`: trim 後 1〜50 文字。`createTeamBody` / `updateTeamBody` 共通。
- `inviteCode`: trim 後 1 文字以上（形式チェックはサービス側で正規化して照合）。
- `status`: `"online" | "resting"` の enum。

---

## 5. サービス層のロジック（`team.service.ts`）

### 5.1 レスポンス整形

| 関数 | 役割 |
| --- | --- |
| `mapActivity(activity)` | `resting` → `"resting"`、それ以外 → `"working"`。他サービス（home / member）からも import される。 |
| `initial(name)` | 表示用の頭文字（先頭 1 文字を大文字化、無ければ `"M"`）。 |
| `toSettings(team)` | `Team + members(+user)` を `TeamSettingsResponse` に変換。 |
| `findMembership(userId)` | `TeamMembership` を team・members・user 込みで 1 件取得。 |

### 5.2 参照系

| 関数 | 挙動 |
| --- | --- |
| `hasTeam(userId)` | membership 件数 > 0。`stats.service` などからも使用。 |
| `getCurrentTeam(userId)` | チーム設定。未加入なら `null`。 |
| `getMyStatus(userId)` | 自分の `activity` を `MemberStatus` に写像。未加入は 404。 |
| `getTeamSummary(userId)` | **静的スナップショット** `teamSummarySnapshot` を返すだけ（加入時のみ、未加入は `null`）。 |
| `getTeamRanking(userId)` | **静的スナップショット** `rankingSnapshot` を score 降順で返す（未加入は `null`）。 |

### 5.3 更新系

| 関数 | 主な処理 | エラー |
| --- | --- | --- |
| `createTeam(userId, name)` | 既加入チェック → `ensureUser` → `Team` 作成と同時に自分を membership 追加 → `TeamSettingsResponse`。招待コードは `uniqueInviteCode()` で採番。 | 既にチーム所属なら 409 |
| `joinTeam(userId, inviteCode)` | 既加入チェック → 全チームを取得し `normalizeCode` 一致で対象特定 → `ensureUser` → membership 追加 → `member_joined` 通知を積む。 | 既加入 409 / コード不一致 404 |
| `renameTeam(userId, name)` | 自分の membership からチームを引いて `Team.name` を更新。 | チーム無し 404 |
| `leaveTeam(userId)` | membership を削除。残り 0 人ならチーム本体も削除。membership が無ければ黙って return。 | なし（冪等） |
| `setActivity(userId, activity)` | `TeamMembership.activity` を更新して最新のチーム設定を返す。 | チーム無し 404 |

### 5.4 招待コード

```
generateInviteCode()  →  "NAP-1000" 〜 "NAP-9999"（4 桁乱数）
uniqueInviteCode()    →  最大 20 回リトライして未使用コードを採番。取れなければ 500
normalizeCode(code)   →  英数字以外を除去し大文字化。"NAP-4821" と "nap4821" を同一視
```

`joinTeam` は `inviteCode` の `@unique` 検索ではなく、
**全 `Team` を取得して正規化比較**している（ハイフンや大小文字の揺れを
吸収するため）。チーム数が増えたらここは要見直し。

### 5.5 `ensureUser(userId)`

チームのルートは `authenticate` の後ろにあるため、通常呼び出し元は既存
`User`。これは旧 `X-User-Id` 経路（他機能のルート）向けの保険で、既存
ユーザーには no-op（`prisma.user.upsert` の `update: {}`）。
シードユーザーは `prisma/seed.ts` で作られる。

---

## 6. メンバー詳細とナッジ

### 6.1 `member.service.getMemberDetail(userId, targetId)`

- 呼び出し元と対象が **同じチーム** のときだけ結果を返す。違えば
  `undefined` → コントローラが 404。
- `nap` は常に `null`（ライブな仮眠セッションのモデルがまだ無い）。
- `wakeSupport.wakeAssistEnabled` は `TeamMembership.wakeAssistEnabled`。

### 6.2 `nudge.service.sendNudge(fromUserId, toUserId, kind)`

- `kind` は `"wake" | "rest"`。
- 自分自身への送信は 400、相手が別チームなら 400、送信者/相手が未加入なら 404。
- `kind === "wake"` かつ相手の `wakeAssistEnabled` が false なら 409。
- 成功時は対象向けの通知（`wake_request` / `rest_request`）を積んで
  `{ success: true }`。**ナッジ自体は永続化しない。**

---

## 7. 通知連携

`joinTeam` と `sendNudge` は `notifications.service.addNotification()` を呼ぶ。
現状の通知ストアは **in-memory**（サーバ再起動で消える）。チーム機能側は
「通知を積む」以上のことはしていない。

- `joinTeam`: `member_joined` —「〇〇がチームに参加しました / チームは N 人になりました」
- `sendNudge(wake)`: `wake_request` —「〇〇から「起きて〜」」
- `sendNudge(rest)`: `rest_request` —「〇〇から「休んでね」」

---

## 8. 実データと静的スナップショットの境界

| 部分 | 状態 |
| --- | --- |
| チーム作成 / 参加 / 離脱 / 改名 | ✅ Postgres 永続化 |
| メンバー一覧・在席ステータス・起床サポート | ✅ Postgres |
| メンバー詳細（`nap` を除く） | ✅ Postgres |
| メンバー詳細の `nap` | ⚠️ 常に `null`（未実装） |
| `GET /teams/summary` | ⚠️ `teamSummarySnapshot` 固定値 |
| `GET /teams/ranking` | ⚠️ `rankingSnapshot` 固定値（`memberX` はダミー、`score` も手書き） |
| 通知 | ⚠️ in-memory |

---

## 9. 型の契約

`team.service.ts` が公開する型がフロントとの契約。フロントは
`mobile/src/types/api.ts` に同じ形を手で持っているので、変更時は両方直す。

- `TeamSettingsResponse` — `{ teamName, memberCount, inviteCode, members: Member[] }`
- `TeamSummaryResponse` — 週次サマリー + 提案 + achievement
- `TeamRankingResponse` — `{ memberCount, entries: TeamRankingEntry[] }`
- `MemberDetailResponse`（`member.service.ts`）
- 共有ドメイン型 `Member` / `MemberStatus` / `WeeklyBarState` は
  `src/types/domain.ts`

---

## 10. ローカルで動かす

```bash
cd backend
cp .env.example .env          # DATABASE_URL を設定
npm install
npm run db:migrate            # prisma migrate dev
npm run db:seed               # 開発ユーザー + "TEAM NAP 開発チーム"(NAP-4821)
npm run dev
```

動作確認例（すべて `Authorization: Bearer <token>` が必要）。

```bash
BASE=http://localhost:3000/api/v1

# ログインしてトークンを取得（シードユーザー）
TOKEN=$(curl -s -XPOST $BASE/auth/login -H 'content-type: application/json' \
  -d '{"email":"dev@teamnap.local","password":"teamnap-dev"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
AUTH="authorization: Bearer $TOKEN"

# チーム設定を見る（シードのチームに加入済み）
curl -s $BASE/settings/team -H "$AUTH"

# 自分のステータスを更新
curl -s -XPUT $BASE/teams/me/status -H "$AUTH" -H 'content-type: application/json' \
  -d '{"status":"resting"}'

# 新規ユーザーで別チームを作る / 参加する
NEW=$(curl -s -XPOST $BASE/auth/signup -H 'content-type: application/json' \
  -d '{"name":"夜勤","email":"night@example.com","password":"nightshift"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
curl -s -XPOST $BASE/teams -H "authorization: Bearer $NEW" \
  -H 'content-type: application/json' -d '{"name":"夜勤チーム"}'
curl -s -XPOST $BASE/teams/join -H "authorization: Bearer $NEW" \
  -H 'content-type: application/json' -d '{"inviteCode":"nap4821"}'  # => 既にチーム所属なら 409
```

---

## 11. 既知の TODO / 注意点

- `joinTeam` の招待コード照合が全件スキャン。件数増加時にインデックス
  検索（`normalizeCode` を保存列にする等）へ移行する。
- `summary` / `ranking` を実データ（仮眠履歴）から算出する。
- メンバー詳細の `nap`（ライブ仮眠セッション）モデルが未定義。
- 通知ストアが in-memory。永続化するとチーム参加通知も残るようになる。
- チームのルートは `authenticate` 必須になった。他機能のルート
  （home / schedule / stats など）はまだ `X-User-Id` フォールバックのまま。
  `ensureUser` はその旧経路向けの保険として残している。
