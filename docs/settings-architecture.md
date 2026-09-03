# 設定機能 バックエンド / フロントエンド 役割分担

## 1. 目的

設定（Settings）まわりで「どこに何を書くか」を迷わないように、
バックエンドとフロントエンドの責務を整理する。

対象は「設定」タブとそのサブ画面（アカウント情報 / 睡眠スケジュール /
カレンダー連携 / チーム設定 / 通知トグル）。

---

## 2. 全体像

```text
[ 画面 ]  features/*/XxxScreen.tsx        表示・入力・画面内バリデーション・遷移
   |            uses
   v
[ フック ] hooks/useXxxSettings.ts        load / saving / error, 楽観的更新, アクション
   |            calls
   v
[ サービス ] services/settings.ts          api.get / api.post の薄いラッパー（URLとメソッドだけ）
   |            HTTP (JSON)
   v
[ ルート ] backend routes/settings.routes.ts   URL と HTTP メソッドの割り当て
   |
   v
[ コントローラ ] backend controllers/settings.controller.ts   body の受け取り・最小限の正規化・200 で返却
   |
   v
[ サービス ] backend services/settings.service.ts   ユーザーの `Onboarding` 行の読み書きと、レスポンス形への変換
```

型（レスポンスの形）は **フロント `mobile/src/types/api.ts`** と
**バックエンド `settings.service.ts` の `export type`** の両方に定義があり、
これが両者の契約になっている（手動で揃える必要がある）。

ベースURLはフロントの `EXPO_PUBLIC_API_URL`。ルートは `routes/index.ts` で
`/settings` にマウントされている。

---

## 3. エンドポイント一覧

> アカウント名 / メールは `User` テーブルにあり、`GET /auth/me` で取得、
> `PATCH /auth/me` で更新します。**`/settings/account` エンドポイントは
> 存在しません**（以前の実装は削除済み）。

| メソッド & パス | 用途 | リクエスト body | レスポンス型 | フロント: サービス関数 / フック | 画面 |
|---|---|---|---|---|---|
| `GET /settings/notifications` | 通知トグルの取得 | – | `NotificationSettingsResponse` | `getNotificationSettings` / `useNotificationSettings` | `features/settings`（設定タブ） |
| `POST /settings/notifications` | 通知トグルの更新（部分更新） | `Partial<NotificationSettingsResponse>` | `NotificationSettingsResponse` | `updateNotificationSettings` / `useNotificationSettings.setNotification` | 〃 |
| `GET /settings/sleep-schedule` | 睡眠スケジュールの取得 | – | `SleepScheduleResponse` | `getSleepSchedule` / `useSleepSchedule` | `features/sleep-schedule` |
| `POST /settings/sleep-schedule` | 就寝 / 起床時間の更新 | `{ bedtime, wakeTime }` | `SleepScheduleResponse` | `updateSleepSchedule` / `useSleepSchedule.save` | 〃 |
| `GET /settings/calendar` | カレンダー連携状態の取得 | – | `CalendarIntegrationResponse` | `getCalendarIntegration` / `useCalendarSettings` | `features/calendar` |
| `POST /settings/calendar/google/sync` | Google カレンダーを今すぐ同期 | – | `CalendarIntegrationResponse` | `syncGoogleCalendar` / `useCalendarSettings.syncNow` | 〃 |
| `POST /settings/calendar/google/disconnect` | Google 連携解除 | – | `CalendarIntegrationResponse` | `disconnectGoogleCalendar` / `useCalendarSettings.disconnectGoogle` | 〃 |
| `POST /settings/calendar/device/connect` | 端末カレンダー連携 | – | `CalendarIntegrationResponse` | `connectDeviceCalendar` / `useCalendarSettings.connectDevice` | 〃 |
| `GET /settings/team` | チーム設定の取得 | – | `TeamSettingsResponse` | `getTeamSettings` / `useTeamSettings` | `features/team-settings` |
| `POST /settings/team/leave` | チームを退出 | – | `{ success: true }` | `leaveTeam` / `useTeamSettings.leave` | 〃 |

---

## 4. レイヤーごとの責務

### バックエンド

| ファイル | 責務 | やらないこと |
|---|---|---|
| `routes/settings.routes.ts` | URL とメソッドをコントローラに割り当てる | ロジックは持たない |
| `controllers/settings.controller.ts` | `requireUserId(req)` で呼び出しユーザーを取り、`req.body`（zod で検証済み）を渡してサービスを呼び、**200 + JSON** を返す | 業務ルールの検証、DBアクセス |
| `services/settings.service.ts` | そのユーザーの `Onboarding` 行（無ければ upsert で作成）を読み書きし、レスポンス形に変換する | HTTP のことは知らない |

**現状**

- **永続化あり**: 睡眠スケジュール / 通知トグル / カレンダー連携状態は、そのユーザーの
  `Onboarding` 行（`bedtime` / `wakeTime` / `napCutoffHour` / `notify*` /
  `calendar*Connected` / `calendarLastSyncedAt`）。オンボーディングと**同じ行**なので
  値が食い違わない。
- **ユーザー単位**: 全ルート `authenticate` 必須。`Onboarding` 行が単一ソース。
- **カレンダー連携は OAuth なしのサンプル取り込み**: `google/sync` は
  `calendarConnected` / `calendarLastSyncedAt` を更新し、`google-calendar-sample.ts`
  の定型 1 週間分を `schedule.service` 経由で**そのユーザーの `CalendarEvent` に
  取り込む**（`source: "google"`、`externalId` で洗い替え）。`google/disconnect` は
  `source: "google"` の行を全削除。`google.email` / `lastSyncedLabel` は連携中のみ値が入る。
- **業務バリデーション**: zod スキーマ（`schemas/settings.schema.ts`）で形式は検証。
  就寝〜起床が 16 時間以内かはサーバー（zod refine, `lib/sleep-window.ts`）でも検証。

### フロントエンド

| ファイル / 層 | 責務 |
|---|---|
| `types/api.ts` | レスポンス型の定義（＝バックエンドとの契約） |
| `services/settings.ts` | `api.get` / `api.post` に URL を渡すだけの薄いラッパー。ここに状態やロジックは置かない |
| `hooks/useXxxSettings.ts` | 画面の状態管理: 初回 `GET`（`loading`）、更新中フラグ（`saving`）、`error` 文字列、レスポンスでの `data` 差し替え。<br>・通知: **楽観的更新**（先に UI を更新し、失敗時に戻す）<br>・カレンダー: `syncNow` / `disconnectGoogle` / `connectDevice` の3アクション<br>・チーム: `leave()` |
| `features/*/XxxScreen.tsx` | 表示、ユーザー入力（`useState` の下書き）、**画面内バリデーション**、ナビゲーション、TODO（未接続の操作） |
| `app/(tabs)/settings.tsx`, `app/settings/*.tsx` | ルート定義。中身は `features/*` の re-export のみ |

**画面 ↔ フック ↔ 型の対応**

| 画面 | フック | 型 | ルート |
|---|---|---|---|
| `features/settings/SettingsScreen` | `useNotificationSettings` | `NotificationSettingsResponse` | `/settings`（`(tabs)`） |
| `features/account/AccountScreen` | `useAuth()`（`/auth/me` + `PATCH /auth/me`） | `AuthUser` | `/settings/account` |
| `features/sleep-schedule/SleepScheduleScreen` | `useSleepSchedule` | `SleepScheduleResponse` | `/settings/sleep-schedule` |
| `features/calendar/CalendarSettingsScreen` | `useCalendarSettings` | `CalendarIntegrationResponse` | `/settings/calendar` |
| `features/team-settings/TeamSettingsScreen` | `useTeamSettings` | `TeamSettingsResponse` | `/settings/team` |

---

## 5. データフローの例（通知トグル）

1. `SettingsScreen` が表示され、`useNotificationSettings` が `GET /settings/notifications` を実行 → `data` に反映。
2. ユーザーが `Toggle` を切り替え → `setNotification("napEnd", false)`。
3. フック: `data` を先に楽観的更新（UI 即反映）→ `POST /settings/notifications { napEnd: false }`。
4. バックエンド: controller が `requireUserId` + body をサービスへ → サービスがそのユーザーの `Onboarding` 行の `notify*` 列を部分更新 → 200 で全体を返す。
5. フック: レスポンスで `data` を差し替え（成功）。失敗時は手順3の値に巻き戻し、`error` を表示。

---

## 6. バリデーションの分担

| 種類 | 置き場所 | 現状 |
|---|---|---|
| 即時フィードバック（入力形式・順序など） | **フロント（画面）** | 睡眠スケジュール: 「起床は就寝より後（オーバーナイト考慮の睡眠時間 0〜16時間）」を画面で判定し、不正なら保存ボタンを無効化＋エラー表示 |
| 型の正規化 | バックエンド（controller） | string でなければデフォルト値に落とす程度 |
| 業務ルール（本来サーバーでも必須） | **一部のみ** | zod スキーマで型・形式・範囲を検証。メール重複は 409、招待コード照合は正規化列の一意インデックス、睡眠ウィンドウ（就寝〜起床 ≤16h）はサーバーでも refine、メンバー削除はオーナー権限チェックあり |

方針: **UX 用のチェックはフロント、正当性の保証はサーバー**。現状はサーバー側が薄いので、
重要なルールはサーバーにも二重で入れる。

---

## 7. 現状のギャップ / TODO

**済み**

- [x] 永続化 + ユーザー単位化: 睡眠スケジュール / 通知トグル / カレンダー連携状態は
  そのユーザーの `Onboarding` 行（オンボーディングと同じ行 → 値が食い違わない）
- [x] `/settings/account` は削除。アカウント名 / メールは `/auth/me` + `PATCH /auth/me`
- [x] 「ログアウト」はアカウント画面・設定タブとも二段階確認ダイアログ＋`useAuth().signOut()`
- [x] `POST /settings/team/leave` は `team.service` 経由で実際に離脱する
- [x] チーム設定: メンバー管理（`ManageMembersScreen` + `DELETE /teams/members/:id`）/ 招待リンク共有（ディープリンク）/ コードのコピー
- [x] 睡眠ウィンドウのサーバー検証（`lib/sleep-window.ts`）
- [x] カレンダー: ユーザーごとの `CalendarEvent` 永続化 + `google/sync` でサンプル 1 週間分を取り込み / `google/disconnect` で削除

**未対応**

- [ ] カレンダー: 実際の Google OAuth / 端末カレンダー同期（現状は OAuth なしのサンプル取り込み）
- [ ] 睡眠スケジュール: `napCutoffHour` はサーバー所有で編集 UI なし
- [ ] アカウント: プロフィール写真
- [ ] チーム名変更をオーナー限定にするか未決

---

## 8. 設定項目を追加する手順

### バックエンド

1. 保存先を決める。ユーザー設定なら `Onboarding` に列を足す（`schema.prisma` +
   `prisma migrate dev`）。別テーブルが要るなら新設。
2. `services/settings.service.ts`: `getXxx(userId)` / `updateXxx(userId, patch)` を追加し、
   `Onboarding` 行を読み書き。`export type XxxResponse` を定義。
3. `schemas/settings.schema.ts`: body の zod スキーマを追加。
4. `controllers/settings.controller.ts`: `requireUserId(req)` を渡す `getXxxController` /
   `updateXxxController` を追加。
5. `routes/settings.routes.ts`: `router.get/post("/xxx", validate({ body }), ...)` を追加。

### フロントエンド

6. `mobile/src/types/api.ts`: `XxxResponse` を追加（バックエンドの型と一致させる）。
7. `mobile/src/services/settings.ts`: `getXxx` / `updateXxx`（`api.get`/`api.post`）を追加。
8. `mobile/src/hooks/useXxxSettings.ts`: `data / loading / saving / error` ＋ 更新関数のフックを作成（既存フックをコピーが早い）。
9. 画面（`features/…`）で `useXxxSettings` を使い、必要なら画面内バリデーションを実装。
10. サブ画面なら `mobile/src/app/settings/xxx.tsx` に re-export を1行追加し、`SettingsScreen` の該当 `SettingsRow` から `router.push("/settings/xxx")`。
