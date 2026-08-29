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
[ サービス ] backend services/settings.service.ts   状態の保持（現状 in-memory の let 変数）と更新ロジック
```

型（レスポンスの形）は **フロント `mobile/src/types/api.ts`** と
**バックエンド `settings.service.ts` の `export type`** の両方に定義があり、
これが両者の契約になっている（手動で揃える必要がある）。

ベースURLはフロントの `EXPO_PUBLIC_API_URL`。ルートは `routes/index.ts` で
`/settings` にマウントされている。

---

## 3. エンドポイント一覧

| メソッド & パス | 用途 | リクエスト body | レスポンス型 | フロント: サービス関数 / フック | 画面 |
|---|---|---|---|---|---|
| `GET /settings/account` | アカウント情報の取得 | – | `AccountSettingsResponse` | `getAccountSettings` / `useAccountSettings` | `features/account` |
| `POST /settings/account` | アカウント情報の更新 | `{ username, email }` | `AccountSettingsResponse` | `updateAccountSettings` / `useAccountSettings.save` | 〃 |
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
| `controllers/settings.controller.ts` | `req.body` を受け取り、型が違うときのフォールバック（例: `bedtime` が string でなければ `"23:30"`）だけ行い、サービスを呼んで **200 + JSON** を返す | 業務ルールの検証、DBアクセス |
| `services/settings.service.ts` | 設定の状態を保持（現状 `let` 変数）し、取得 / 更新（部分マージ）を行う。レスポンスの形を決める | HTTP のことは知らない |

**現状の制約（重要）**

- **永続化なし**: 状態はプロセス内の `let` 変数。サーバー再起動で初期値に戻る（DB / Prisma 未接続）。
- **ユーザー単位ではない**: グローバルに1件だけ。認証・ユーザーIDの概念がない。
- **エラーを返さない**: すべて 200。バリデーション失敗や 404 の分岐がない。
- **業務バリデーションなし**: 例えば睡眠スケジュールの「就寝 < 起床」チェックはサーバーには無い（フロントのみ）。

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
| `features/account/AccountScreen` | `useAccountSettings` | `AccountSettingsResponse` | `/settings/account` |
| `features/sleep-schedule/SleepScheduleScreen` | `useSleepSchedule` | `SleepScheduleResponse` | `/settings/sleep-schedule` |
| `features/calendar/CalendarSettingsScreen` | `useCalendarSettings` | `CalendarIntegrationResponse` | `/settings/calendar` |
| `features/team-settings/TeamSettingsScreen` | `useTeamSettings` | `TeamSettingsResponse` | `/settings/team` |

---

## 5. データフローの例（通知トグル）

1. `SettingsScreen` が表示され、`useNotificationSettings` が `GET /settings/notifications` を実行 → `data` に反映。
2. ユーザーが `Toggle` を切り替え → `setNotification("napEnd", false)`。
3. フック: `data` を先に楽観的更新（UI 即反映）→ `POST /settings/notifications { napEnd: false }`。
4. バックエンド: controller が body をそのままサービスへ → サービスが `let notificationSettings` を部分マージ → 200 で全体を返す。
5. フック: レスポンスで `data` を差し替え（成功）。失敗時は手順3の値に巻き戻し、`error` を表示。

---

## 6. バリデーションの分担

| 種類 | 置き場所 | 現状 |
|---|---|---|
| 即時フィードバック（入力形式・順序など） | **フロント（画面）** | 睡眠スケジュール: 「起床は就寝より後（オーバーナイト考慮の睡眠時間 0〜16時間）」を画面で判定し、不正なら保存ボタンを無効化＋エラー表示 |
| 型の正規化 | バックエンド（controller） | string でなければデフォルト値に落とす程度 |
| 業務ルール（本来サーバーでも必須） | **未実装** | 就寝<起床、メール形式、招待コードの有効性、権限チェックなど。今後 controller / service に追加が必要 |

方針: **UX 用のチェックはフロント、正当性の保証はサーバー**。現状はサーバー側が薄いので、
重要なルールはサーバーにも二重で入れる。

---

## 7. 現状のギャップ / TODO

**バックエンド**

- [ ] 永続化: `let` 変数 → Prisma / PostgreSQL（`docs/db.md` の設計に寄せる）
- [ ] 認証・ユーザー単位化: 今はグローバル1件。ユーザーID で引く
- [ ] サーバー側バリデーションとエラーレスポンス（400 / 404 / 標準エラー形）
- [ ] `POST /settings/team/leave` の実体（現状 `{ success: true }` を返すだけ）

**フロントエンド（画面に TODO コメントで残っている未接続操作）**

- [ ] アカウント: 写真を変更 / アカウントを削除
- [ ] 睡眠スケジュール: 画面内バリデーションはあるが、`napCutoffHour` は編集不可（サーバー所有）
- [ ] カレンダー: 招待コードのコピー、実際の Google OAuth フロー
- [ ] チーム設定: チーム名編集 / メンバー管理 / 招待リンク共有 / 招待コードのコピー
- [ ] 「ログアウト」は `router.replace("/login")` のみ（トークン破棄なし＝モック認証のため）

---

## 8. 設定項目を追加する手順

### バックエンド

1. `services/settings.service.ts`: 状態（`let`）と `getXxx` / `updateXxx` を追加し、`export type XxxResponse` を定義。
2. `controllers/settings.controller.ts`: `getXxxController` / `updateXxxController` を追加（body の正規化はここ）。
3. `routes/settings.routes.ts`: `router.get/post("/xxx", ...)` を追加。

### フロントエンド

4. `mobile/src/types/api.ts`: `XxxResponse` を追加（バックエンドの型と一致させる）。
5. `mobile/src/services/settings.ts`: `getXxx` / `updateXxx`（`api.get`/`api.post`）を追加。
6. `mobile/src/hooks/useXxxSettings.ts`: `data / loading / saving / error` ＋ 更新関数のフックを作成（既存フックをコピーが早い）。
7. 画面（`features/…`）で `useXxxSettings` を使い、必要なら画面内バリデーションを実装。
8. サブ画面なら `mobile/src/app/settings/xxx.tsx` に re-export を1行追加し、`SettingsScreen` の該当 `SettingsRow` から `router.push("/settings/xxx")`。
