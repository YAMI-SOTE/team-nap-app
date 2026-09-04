# チーム機能 バックエンド実装ガイド

## 1. 目的

「チーム（Team）」機能のバックエンド側の実装を、どこに何が書かれているか
迷わないように整理する。対象は次の画面・ユースケース。

- チームをつくる / 招待コードで参加する / チームを抜ける
- チーム設定（名前変更、メンバー一覧、招待コード表示）
- 自分の在席ステータス（作業中 / 休憩中）の取得・更新
- メンバー詳細（進行中の仮眠「あと◯分」を含む）と「起きて」「休んで」のナッジ送信
- 今週の Team Nap サマリー・仮眠上手ランキング（`NapRecord` 由来の実データ）

関連ドキュメント: [db.md](./db.md) / [backend.md](./backend.md) /
[settings-architecture.md](./settings-architecture.md) / [notifications.md](./notifications.md)

---

## 2. 全体像

リクエストの流れは他機能と同じ（[backend.md](./backend.md) の「リクエストの流れ」）。

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

`backend/prisma/schema.prisma`。関連マイグレーション:
`20260830091652_team_feature`（初版）/
`20260901224358_team_roles_and_invite_index`（`role` + `inviteCodeNormalized`）。

```prisma
model Team {
  id                   String           @id @default(uuid())
  name                 String
  inviteCode           String           @unique
  inviteCodeNormalized String           @unique @default("")
  createdAt            DateTime         @default(now())
  members              TeamMembership[]
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
  role              String         @default("member")   // "owner" | "member"
  joinedAt          DateTime       @default(now())

  @@unique([teamId, userId])
  @@unique([userId])   // ← 1 ユーザーは最大 1 チーム
}
```

（`User` は他機能でも列が増えているため省略。`db.md` 参照。）

ポイント。

| 制約 | 意味 |
| --- | --- |
| `TeamMembership.@@unique([userId])` | 1 ユーザーは同時に 1 チームだけ。DB とサービス層の両方で担保。 |
| `Team.inviteCode @unique` | 招待コードは全体で一意。表示用。 |
| `Team.inviteCodeNormalized @unique` | `normalizeCode(inviteCode)`。`joinTeam` はこの列をインデックス検索（全件走査なし）。 |
| `TeamMembership.role` | `"owner"`（作成者）/ `"member"`。メンバー削除はオーナーのみ。オーナー離脱で最古参へ委譲。 |
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
| `POST /teams/nap-suggestion` | `{ minutes? }`（5〜60、既定 15） | 200 / 404 | `suggestTeamNap` | `{ success: true, notified }` |
| `GET /teams/me/status` | – | 200 | `getMyStatus` | `{ status: MemberStatus }` |
| `PUT /teams/me/status` | `{ status: "online" \| "resting" }` | 200 | `setActivity` | `TeamSettingsResponse` |
| `GET /teams/members/:id` | – | 200 / 404 | `getMemberDetail` | `MemberDetailResponse` |
| `POST /teams/members/:id/wake` | – | 200 | `sendNudge(…, "wake")` | `{ success: true }` |
| `POST /teams/members/:id/rest` | – | 200 | `sendNudge(…, "rest")` | `{ success: true }` |
| `DELETE /teams/members/:id` | – | 200 / 400 / 403 | `removeMember` | `TeamSettingsResponse` |

WebSocket は `/api/v1/realtime`（`src/realtime/hub.ts`）。§11 参照。

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
| `getTeamSummary(userId)` | `teamWeek()`（今週 / 先週）から達成率・差分・日次バー・提案文・達成メッセージを組み立てる（未加入は `null`）。 |
| `getTeamRanking(userId)` | 実メンバーを今週の休息スコア降順で返す（未加入は `null`）。 |

`teamWeek()` は `src/services/team-nap-stats.service.ts`。チームメンバーの
その週の `NapRecord` を集計し、per-member 週スコア（`lib/rest-score.ts` の式）・
達成人数・チーム平均の日次コンディション（未来日は `null`）・日次仮眠率などを返す。
`home.service` のチームスコアと `stats.service.getTeamStats` も同じ集計を使う。

### 5.3 更新系

| 関数 | 主な処理 | エラー |
| --- | --- | --- |
| `createTeam(userId, name)` | 既加入チェック → `ensureUser` → `Team` 作成と同時に自分を membership 追加 → `TeamSettingsResponse`。招待コードは `uniqueInviteCode()` で採番。 | 既にチーム所属なら 409（同時実行で `@@unique` に当たった場合も 409 に変換） |
| `joinTeam(userId, inviteCode)` | 既加入チェック → 全チームを取得し `normalizeCode` 一致で対象特定 → `ensureUser` → membership 追加 → 既存メンバー各自へ `member_joined` 通知。 | 既加入 409（同時実行も 409） / コード不一致 404 |
| `renameTeam(userId, name)` | 自分の membership からチームを引いて `Team.name` を更新。 | チーム無し 404 |
| `leaveTeam(userId)` | membership を削除。残り 0 人ならチーム本体も削除。membership が無ければ黙って return。 | なし（冪等） |
| `setActivity(userId, activity)` | `TeamMembership.activity` を更新して最新のチーム設定を返す。 | チーム無し 404 |
| `suggestTeamNap(userId, minutes)` | 自分以外の全メンバーのフィードへ `team_nap_suggestion` 通知を積む（+ プッシュ）→ `{ success, notified }`。 | チーム無し 404 |

### 5.4 招待コード

```
generateInviteCode()  →  "NAP-1000" 〜 "NAP-9999"（4 桁乱数）
uniqueInviteCode()    →  最大 20 回リトライして未使用コードを採番。取れなければ 500
normalizeCode(code)   →  英数字以外を除去し大文字化。"NAP-4821" と "nap4821" を同一視
```

`joinTeam` は入力コードを `normalizeCode()` し、`Team.inviteCodeNormalized`
（`@unique` インデックス）を `findUnique` で直接引く。全件走査はしない。
採番時（`uniqueInviteCode()`）に `inviteCode` と `inviteCodeNormalized` を
両方保存する。

### 5.5 `ensureUser(userId)`

チームのルートは `authenticate` の後ろにあるため、通常呼び出し元は既存
`User`。これは旧 `X-User-Id` 経路（他機能のルート）向けの保険で、既存
ユーザーには no-op（`prisma.user.upsert` の `update: {}`）。
シードユーザーは `prisma/seed.ts` で作られる。

---

## 6. メンバー詳細・ナッジ・ライブ仮眠

### 6.1 `member.service.getMemberDetail(userId, targetId)`

- 呼び出し元と対象が **同じチーム** のときだけ結果を返す。違えば
  `undefined` → コントローラが 404。
- `nap` は対象の進行中 `NapSession` から `{ wakeAt（JST "HH:MM"）,
  minutesRemaining }`。無ければ `null`（`nap-session.service.activeNapSession`）。
- `wakeSupport.wakeAssistEnabled` は `TeamMembership.wakeAssistEnabled`。

### 6.1a ライブ仮眠セッション（`NapSession`）

`src/services/nap-session.service.ts`。休憩タイマー画面が自分のセッションを
publish し、teammate の「あと◯分」カードのソースになる。

| API | 動作 |
| --- | --- |
| `PUT /api/v1/rest/session { plannedMinutes }` | upsert（`wakeAt = now + plannedMinutes`）。タイマー開始 / 再開で呼ぶ |
| `DELETE /api/v1/rest/session` | 削除（冪等）。終了 / キャンセル / 画面離脱 / `POST /naps` で呼ぶ |

`wakeAt` を 30 分以上過ぎた行は「アプリが落ちて終了できなかった」とみなして
読み出し時に無視 + 掃除する。1 ユーザー最大 1 行（`userId @unique`）。

### 6.2 `nudge.service.sendNudge(fromUserId, toUserId, kind)`

- `kind` は `"wake" | "rest"`。
- 自分自身への送信は 400、相手が別チームなら 400、送信者/相手が未加入なら 404。
- `kind === "wake"` かつ相手の `wakeAssistEnabled` が false なら 409。
- 成功時は **対象（`toUserId`）の**フィードへ通知（`wake_request` /
  `rest_request`）を積んで `{ success: true }`。**ナッジ自体は永続化しない。**

---

## 7. 通知連携

`joinTeam` / `sendNudge` / `removeMember` / `suggestTeamNap` は
`notifications.service.addNotification(userId, { kind, title, body })` を呼ぶ。
フィードは Postgres 永続化（`Notification` テーブル）で、同時に Expo プッシュも
飛ぶ（宛先が通知オプトイン済みのとき）。詳細は [notifications.md](./notifications.md)。

- `joinTeam`: `member_joined` を **加入前からいた各メンバーの**フィードへ
  —「〇〇がチームに参加しました / チームは N 人になりました」（加入者本人には積まない）
- `removeMember`: 除名された本人のフィードへ `member_joined` kind で
  「チームから退出しました」通知（＋ WS ソケット切断）
- `sendNudge(wake)`: `wake_request` を **対象（`toUserId`）の**フィードへ —「〇〇から「起きて〜」」
- `sendNudge(rest)`: `rest_request` を対象のフィードへ —「〇〇から「休んでね」」
- `suggestTeamNap`: `team_nap_suggestion` を **自分以外の全メンバーの**フィードへ
  —「〇〇さんからチーム仮眠の提案 / N分、みんなで仮眠しませんか？」

---

## 8. 実装状況

| 部分 | 状態 |
| --- | --- |
| チーム作成 / 参加 / 離脱 / 改名 | ✅ Postgres |
| メンバー一覧・在席ステータス・起床サポート | ✅ Postgres |
| 在席ステータスのライブ更新 | ✅ WebSocket（`/api/v1/realtime`）。socket 接続を第一根拠にし、`lastSeenAt` で減衰。20 秒ごとの sweep が「変化したときだけ」push するので、アプリを閉じた人もちゃんとオフラインに落ちる。§11 参照 |
| メンバー管理（オーナー権限・除名・オーナー委譲） | ✅ `role` 列 + `DELETE /teams/members/:id`（オーナーのみ） |
| 招待コード照合 | ✅ `inviteCodeNormalized` の一意インデックスを直接引く |
| メンバー詳細の `nap`（「あと◯分」） | ✅ `NapSession` から（§6.1a） |
| `GET /teams/summary` / `ranking` | ✅ `NapRecord` 由来の実データ（`team-nap-stats.service`） |
| 通知フィード | ✅ Postgres 永続化 + Expo プッシュ（[notifications.md](./notifications.md)） |
| `renameTeam` のオーナー限定 | ⚠️ 未決（現状はメンバーなら誰でも可） |

---

## 9. 型の契約

`team.service.ts` が公開する型がフロントとの契約。フロントは
`mobile/src/types/api.ts` に同じ形を手で持っているので、変更時は両方直す。

- `TeamSettingsResponse` — `{ teamName, memberCount, inviteCode, canManage,
  members: TeamSettingsMember[] }`。`canManage` は呼び出し元がオーナーか。
  `TeamSettingsMember` = `Member & { name, role: "owner"|"member", isSelf }`
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

## 11. リアルタイム在席（WebSocket）

`src/realtime/hub.ts` — `ws` で `/api/v1/realtime` にサーバを立てる
（`server.ts` が `http.createServer(app)` にアタッチ）。

- 接続: `ws://<host>/api/v1/realtime?token=<bearer>`。`resolveSession` で
  userId を解決 → 所属チーム。未ログイン `4001` / チーム未加入 `4002`。
- 送信するフレームは 3 種類。**片方向**（変更は引き続き REST 経由）。

  | フレーム | 宛先 | 意味 |
  | --- | --- | --- |
  | `{ type: "member-status", data }` | チーム全員 | 在席スナップショット（`GET /home/member-status` と同形） |
  | `{ type: "notification", data }` | 特定ユーザー | 新着フィード項目。**通知権限不要・Web でも届く** |
  | `{ type: "invalidate", scope }` | チーム全員 | 「読み直して」。`scope` は `"team"` / `"member"` |

  `invalidate` があえてペイロードを持たないのは、クライアントが既存の REST 経路で
  読み直すことで**真実の形が 2 つに分かれないようにする**ため。モバイル側は
  revision カウンタ（`useRealtimeRevision`）として露出し、各 hook は effect の
  依存配列に入れるだけで live になる。

- `broadcastTeamMembers` の呼び出し元: `setActivity` / `joinTeam` / `leaveTeam` /
  `removeMember` / `updateProfile`（アバター・名前は在席ペイロードに載るため）。
  `broadcastInvalidate`: `renameTeam`（`team`）/ 仮眠セッション開始・終了（`member`）。
- **在席の減衰を配信する sweep**（20 秒ごと）。在席は時間で offline に落ちるが、
  それを知らせるイベントは誰も発火しない。sweep が各チームを再計算し、
  **実際に変化したときだけ** push する（変化なしならクエリ 1 回・通信ゼロ）。
  これが無いと「アプリを閉じた人が他人の画面でずっと作業中のまま」になる。
- 30 秒ごとに ping/pong で死んだ接続を落とす。

### 在席の判定（`team-presence.service.ts`）

根拠は 2 段階。

1. **開いている socket**（確実）。hub が `setLivePresenceProbe` で probe を渡す
   （hub → team-presence の一方向 import を保つため。逆向きは循環する）。
   接続した瞬間に「作業中」になる。
2. **`lastSeenAt`**（減衰するフォールバック）。認証済み REST と WS pong で更新。

| 条件 | 結果 |
| --- | --- |
| socket 接続中 | `activity` に従う（作業中 / 仮眠中） |
| `OFFLINE_AFTER_MS`（5分）以上無反応 | オフライン |
| `activity: "resting"` かつ `RESTING_EXPIRES_AFTER_MS`（2時間）以内 | 仮眠中 |
| 上記を超えた `resting` | オフライン（**放置された仮眠が永久に残らない**） |
| socket 切断後 `DISCONNECT_GRACE_MS`（45秒） | オフラインへ（`markDisconnected`） |
| サインアウト | 即オフライン（`markOffline` / `dropUserPresence`） |

- 再接続時に `reconcileActivity` が、実体（live な `NapSession`）の無い `resting`
  フラグを解除する。アプリを kill された仮眠がログインし直しても付いてこない。
- ロスターを組む全箇所（home / team / メンバー詳細 / 週次 stats / 自分の
  ステータス）は `deriveMemberStatus` 経由に統一。画面ごとに判定が食い違わない。
- モバイル: `services/realtime.ts`（グローバル `WebSocket`、指数バックオフ再接続）
  + `RealtimeProvider`（サインイン中だけ接続）。Home / Team 画面はこの
  スナップショットを取得済みデータに上書きする。休憩画面の mount/unmount で
  `setMyStatus("resting" | "online")`。

## 12. メンバー管理

- `TeamMembership.role`（`"owner"` / `"member"`）。`createTeam` で作成者を owner に。
- `DELETE /api/v1/teams/members/:id` — オーナーのみ（`403`）。自分・他オーナーは
  削除不可（`400`）。削除後は broadcast + 対象へ通知 + ソケット切断。
- オーナーが `leaveTeam` した場合、最古参メンバーへ owner を委譲。
- モバイル: `ManageMembersScreen`（`/settings/team-members`）。`canManage` が
  true のとき各行に「削除」（二段階確認）。

## 13. 既知の TODO / 注意点

- `renameTeam` は現状メンバーなら誰でも可能（owner 限定にするかは未決）。
- WebSocket 在席ハブ（`realtime/hub.ts`）はプロセス内状態（`byTeam` / `byUser`）。
  単一インスタンス前提。API を水平スケールするなら socket レジストリの共有
  （Redis pub/sub 等）が別途必要。
- `ensureUser` は旧 `X-User-Id` 経路向けの保険で、現行経路では未到達（実質 no-op）。
