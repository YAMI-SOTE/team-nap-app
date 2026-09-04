# 通知（フィード + プッシュ）

お知らせ画面のフィードは Postgres に永続化され、各通知は宛先ユーザーの
デバイスへ Expo プッシュとしても送られる。

関連: [db.md](./db.md)（`Notification` / `PushToken`）/
[team-feature.md](./team-feature.md)（通知の発火元）/
[settings-architecture.md](./settings-architecture.md)（通知トグル）。

---

## 1. フィード（`Notification`）

`src/services/notifications.service.ts`。

| 関数 | 役割 |
| --- | --- |
| `listNotifications(userId)` | 新しい順。初回は welcome を遅延 seed（冪等） |
| `addNotification(userId, { kind, title, body }, { push })` | 行を作成し、**realtime ソケットへ即送信**し、非同期でプッシュも投げる（`push: false` でプッシュだけ抑止） |
| `markNotificationRead(userId, id)` / `markAllNotificationsRead(userId)` | `readAt` を設定 |

- **`createdAt` が唯一の真実。** 相対時刻ラベル（「たった今」「2分前」「3時間前」
  「N日前」「YYYY/M/D」）と today / earlier 区分は `describeTime()` で**読み出し時に
  毎回導出**する。凍結した文字列を保存しない。
- welcome 通知は「どの経路で作られたユーザーでも初回読み出しで 1 件出る」よう
  遅延 seed。`kind: "welcome"` が既にあれば作らない。
- サーバ再起動をまたいでも残る（旧実装は `Map` で消えていた）。

### エンドポイント（`/api/v1/notifications`、Bearer 必須）

| メソッド / パス | 返却 |
| --- | --- |
| `GET /` | `NotificationItem[]`（新しい順） |
| `POST /read-all` | 全既読にして一覧を返す |
| `POST /:id/read` | 1 件既読にして一覧を返す |
| `POST /token` | デバイスの Expo トークンを登録（下記） |
| `DELETE /token` | トークンを解除（サインアウト時） |

`NotificationItem` = `{ id, kind, title, body, timestamp, read, group }`。
`kind` は `welcome | wake_request | rest_request | nap_ended | weekly_review |
member_joined | team_nap_suggestion`。

### 発火元

| 呼び出し元 | kind | 宛先 |
| --- | --- | --- |
| `nudge.service.sendNudge(…, "wake")` | `wake_request` | ナッジ対象 |
| `nudge.service.sendNudge(…, "rest")` | `rest_request` | ナッジ対象 |
| `team.service.joinTeam` | `member_joined` | 参加前からいた各メンバー |
| `team.service.removeMember` | `member_joined` | 除名された本人 |
| `team.service.suggestTeamNap` | `team_nap_suggestion` | 自分以外の全メンバー |
| `jobs/nap-end.job` | `nap_ended` | 仮眠が予定時刻に達した本人（**プッシュは抑止**、下記） |
| `jobs/weekly-review.job` | `weekly_review` | 全ユーザー（月曜 9:00 JST 以降、週 1 回） |

---

## 1‑2. 配信経路は 3 つ

| 経路 | 届く条件 | 備考 |
| --- | --- | --- |
| **realtime ソケット** | サインイン中で socket 接続済み | `{ type: "notification", data }`。**通知権限不要**。Web でも動く唯一の経路 |
| **Expo プッシュ** | 実機 + 通知許可 + `Onboarding.notificationsEnabled` | シミュレータ・Web では動かない（`!Device.isDevice` で return） |
| **フィード再取得** | 画面マウント時 / フォアグラウンド復帰時 | 取りこぼしの最終防波堤 |

ソケット経由の項目は id で重複排除して先頭に挿入するので、再取得と競合しても
二重に並ばない（`NotificationsProvider`）。

### 起床アラーム（`nap_ended`）だけ設計が違う

**アラーム本体は端末側のローカル通知**（`services/push.ts` の
`scheduleNapEndAlarm`）。理由は、仮眠中の端末はロックされていてアプリが
バックグラウンドにあり、休憩画面の JS タイマーは動いていないから。**アプリが
閉じていても確実に鳴るのはローカル通知だけ。**

サーバ側の `nap-end.job` は 30 秒ごとに `wakeAt` を過ぎた `NapSession` を拾い、
フィード行を書いて `invalidate` を broadcast するが、**`{ push: false }` を渡す**。
端末は既に鳴っており、同じ仮眠で 2 回鳴らすのは鳴らないより悪いため。冪等性は
セッション行を先に `deleteMany` で確保することで担保している。

---

## 2. プッシュ（`PushToken` + Expo）

`src/services/push.service.ts`。アプリ非起動時にも通知を届ける。

```text
Mobile (expo-notifications)                Backend
  権限取得 → Expo トークン取得                addNotification()
      │  POST /notifications/token             │  行を作成
      ▼                                        ▼
  PushToken 行                          void sendPushToUser(userId, {title, body, data})
                                               │  Onboarding.notificationsEnabled を確認
                                               ▼
                                  POST https://exp.host/--/api/v2/push/send
                                               │  DeviceNotRegistered のトークンは削除
```

- **best-effort**: `sendPushToUser` は throw せず、呼び出しをブロックしない。
  フィード行が真実で、プッシュはおまけ。
- **オプトイン**: `Onboarding.notificationsEnabled` が true のときだけ送る
  （設定 › 通知、既定 false）。
- **トークン管理**: `token` はグローバル一意。別アカウントで再登録されたら
  その行を付け替える。Expo が `DeviceNotRegistered` を返したトークンは
  次回送信時に削除。
- **環境変数**: `EXPO_PUSH_URL`（既定 `https://exp.host/--/api/v2/push/send`）、
  `EXPO_ACCESS_TOKEN`（任意。expo.dev の "Enhanced Security for Push
  Notifications" を有効化している場合のみ）。

### Mobile 側

- `mobile/src/services/push.ts` — `registerForPushNotifications()`
  （権限 → `getExpoPushTokenAsync` → `POST /notifications/token`）と
  フォアグラウンド通知ハンドラ。
- `AuthContext` がサインイン時に登録、サインアウト時に解除。
- シミュレータ / 権限拒否 / EAS プロジェクト id 未設定では **何もしない**
  （フィードは通常どおり動く）。

### 実機で確認するには

`getExpoPushTokenAsync` は EAS プロジェクト id を要求する。`eas init` 済みの
プロジェクト id ＋ 開発ビルド（Expo Go は SDK 53+ でプッシュ受信不可）が要る。
バックエンドの登録・送信・無効トークン掃除だけならダミートークンで検証できる:

```bash
B=http://localhost:3000/api/v1
TOKEN=...  # ログイン
curl -s -XPOST $B/notifications/token -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"token":"ExponentPushToken[fake]","platform":"ios"}'
# → 204。Onboarding.notificationsEnabled=true にしてナッジを送ると exp.host に
#   届き、fake トークンは DeviceNotRegistered で自動削除される。
```
