# コアユーザーフロー（ドラフト）

> **ステータス: ドラフト。** 2026-09-20 時点の実装（main）から起こした画面遷移図。
> 要件は [requirements.md](./requirements.md)、構成は [architecture.md](./architecture.md)。
> 各ステップの「API」列は実際に呼ばれるエンドポイント（すべて `/api/v1` 配下、
> `/health` と `/auth/{signup,login,password-reset/*}` 以外は Bearer 必須）。

---

## 0. 画面マップ

```text
/splash ─┐
         ├─ 未ログイン ──▶ (auth)/login ──▶ (auth)/signup ──▶ (auth)/forgot-password
         │
         ├─ ログイン済・未完了 ──▶ (auth)/onboarding
         │
         └─ ログイン済・完了 ──▶ (tabs)/home
                                  │
   ┌──────────────────────────────┴─────────────────────────────────┐
   │  タブ:  ホーム   スケジュール   チーム   統計   設定             │
   └──────────────────────────────┬─────────────────────────────────┘
                                  │
   タブ外のフルスクリーン / モーダル
     /rest（仮眠タイマー）→ /naps/rating → /naps/reflection → /home
     /naps/history            仮眠履歴（各行 → /naps/reflection）
     /notifications           お知らせ
     /members/[id]            メンバー詳細（ナッジ）
     /team/{create,join,invite,ranking}
     /schedule/event          予定の追加・編集
     /settings/{account,sleep-schedule,calendar,team,team-members}
```

**認証ゲートは全ナビゲーションに掛かる**（`useProtectedRoute`）。Web で URL を
直打ちしても同じ判定が働く。

| 状態 | 行き先 |
| --- | --- |
| `signedOut` かつ公開画面（login / signup / forgot-password）以外 | `/login` |
| `signedIn` かつ `onboardingCompleted: false` | `/onboarding` |
| `signedIn` かつ完了済みで、公開画面 / onboarding / splash にいる | `/home` |
| `status === "loading"` | 何もリダイレクトしない（ブートオーバーレイ表示。保護コンテンツを一瞬も出さない） |

---

## 1. 初回フロー（サインアップ → オンボーディング → ホーム）

**アカウント作成が先、質問が後。**

```text
 ① /splash
      │ 保存済みトークンがあれば GET /auth/me
      ▼
 ② /login ──「新規登録」──▶ /signup
      │                        │ 名前 / メール / パスワード(8文字以上)
      │                        ▼  POST /auth/signup → { token, user }
      │                        │  （Onboarding 行をデフォルト値で同時作成）
      │ POST /auth/login       │   bedtime 23:30 / wakeTime 07:30 / 通知 OFF
      ▼                        ▼
 ③ AuthContext.signIn(token)  ── トークンを secure-store へ
      │                        ── POST /notifications/token（Expo プッシュ登録）
      │                        ── WebSocket /realtime へ接続
      ▼
 ④ onboardingCompleted ?
      ├─ true  ────────────────────────────────▶ ⑥ /home
      └─ false ──▶ ⑤ /onboarding
                      GET /onboarding（行が無ければデフォルトを遅延作成）
                      │
                      │ 1. 導入「仕事中って休みにくいよね」
                      │ 2. アイコンを選ぼう（cat / man / woman）
                      │ 3. 睡眠リズム（就寝・起床）  ← 16時間以内を検証
                      │ 4. カレンダーを連携しますか？
                      │ 5. 通知をオンにしよう！
                      │      （途中保存は PUT /onboarding、任意）
                      ▼ POST /onboarding/complete → completedAt を刻む
                    ⑥ /home
```

**エッジケース**

| 状況 | 挙動 |
| --- | --- |
| メールが既に使われている | `POST /auth/signup` が 409 |
| ログイン失敗 | 401。**存在の有無で文言を変えない** |
| **既に別端末でログイン中** | 409「すでに別の端末でログインしています…」。**先にログインしている端末が勝つ**（後から来た側が弾かれる）。復帰は「元端末でサインアウト」「`POST /auth/logout-others`」「パスワード再設定（全セッション失効）」の 3 つ |
| オンボーディング導入前のユーザー（シード等） | `GET /onboarding` が初回アクセスでデフォルト行を作り `completed: false` を返すので、必ずこの段階を通る |
| オンボーディング中にセッションが切れた | `useAuth().status` を見て `/signup` へ戻す |
| パスワードを忘れた | `/forgot-password` → `POST /auth/password-reset/request`（**常に 202**）→ トークンはサーバログ（非本番はレスポンスにも）→ `POST /auth/password-reset/confirm` → 全セッション失効 |

---

## 2. コアループ（毎日ここが回る）

**ホームで提案を受ける → 仮眠する → 評価する → ふりかえる。**

```text
 ┌─ (tabs)/home ────────────────────────────────────────────────┐
 │  GET /home/summary        日付 / AI見出し / チームスコア      │
 │  GET /home/member-status  メンバーの在席（WS で上書き更新）   │
 │  POST /rest/decision      休息提案                            │
 │                                                              │
 │  [休息提案カード]  「14:40〜14:55 に15分休みませんか」        │
 │  [次の空き時間]    「5人中3人が予定なし」                     │
 │  [仮眠を開始]  ←── どちらのボタンからでも /rest へ            │
 └──────────────────────────┬───────────────────────────────────┘
                            ▼
 ┌─ /rest  仮眠タイマー（タブバー非表示・全画面）───────────────┐
 │  mount   : PUT /teams/me/status {"resting"}  → 他メンバーに「仮眠中」│
 │  開始/再開: PUT /rest/session { plannedMinutes }                     │
 │            + 端末ローカル通知で起床アラームを予約                    │
 │  15:00 → 00:00 カウントダウン（一時停止・終了可）                    │
 │  unmount : DELETE /rest/session ＋ アラーム取消                      │
 │            PUT /teams/me/status {"online"}                          │
 └──────────────────────────┬───────────────────────────────────┘
                            ▼ 0 になった / 「終了」を押した
 ┌─ /naps/rating  評価 ─────────────────────────────────────────┐
 │  目覚めの良さ ★1–5 ／ 集中度 1–5                              │
 │  POST /naps { date, start, end, minutes, wakeStars,           │
 │               focusDeltaPt }    ← (集中度-3)×10 = -20..+20    │
 │    サーバ側で AI アドバイスを生成して NapRecord に保存         │
 │    ＋ NapSession を削除（チームメイトの「あと◯分」が消える）   │
 └──────────────────────────┬───────────────────────────────────┘
                            ▼ 返ってきた id で遷移
 ┌─ /naps/reflection  ふりかえり ───────────────────────────────┐
 │  GET /naps/:id → 保存済みの aiAdvice を表示                   │
 │  [ホームへ]                                                   │
 └──────────────────────────┬───────────────────────────────────┘
                            ▼
                        (tabs)/home
```

### なぜこの形なのか

| 設計 | 理由 |
| --- | --- |
| 起床アラームが**端末のローカル通知** | 仮眠中の端末はロックされてアプリがバックグラウンドにあり、画面の JS タイマーは動いていない。**アプリが閉じていても確実に鳴るのはローカル通知だけ** |
| 記録は `/rest` ではなく `/naps/rating` で作る | 評価（`wakeStars` / `focusDeltaPt`）が揃ってから 1 回の `POST /naps` で書くため。AI アドバイス生成も同じ呼び出しに含まれる |
| AI アドバイスを記録行に保存 | 履歴から同じふりかえりを何度でも開けるようにするため（毎回生成し直さない） |
| 画面離脱のどの経路でも後始末する | 「終了」「キャンセル」「戻る」「自動完了」すべてで `NapSession` とアラームを消さないと、他人の画面に幽霊の「あと◯分」が残る |

### 休息提案の判定（`POST /rest/decision`）

入力は **普段の就寝時刻 / 今日の最後の仮眠終了時刻 / 現在時刻（JST）/ 今日の空き時間**。

```text
STEP 1  禁止条件
  15分以上の空き時間が無い ─────────────▶ NO_FREE_TIME      （提案しない）
  就寝まで2時間以内 ────────────────────▶ TOO_LATE          （提案しない）
  直近60分以内に仮眠済み ───────────────▶ RECENTLY_RESTED   （提案しない）

STEP 2  必要度スコア
  今日まだ休んでいない、または前回から120分以上 ── +1
  現在が 13:00〜16:00 ─────────────────────────── +1

STEP 3  2点未満 ───────────────────────▶ NO_REST_NEEDED    （提案しない）

STEP 4  空き時間を採点して1つ選ぶ
  13:00〜16:00 に始まる +2 ／ 60分以内に始まる +1 ／ 同点は早い方

STEP 5  REST_RECOMMENDED — 15分、開始〜終了時刻つきで返す
```

**エッジケース**

| 状況 | 挙動 |
| --- | --- |
| 予定が 1 件も無い | 空き時間が導出できず提案なし。ホームは「仮眠を開始」ボタンのみ |
| チーム未所属 | チームスコア・メンバー・AI アドバイスのブロックを隠し、「チームに参加」導線を出す。仮眠自体は普通にできる |
| Ollama が落ちている / 遅い | ルールベース・定型文にフォールバック。**5xx は返さない** |
| 同じ日に 2 回仮眠した | どちらも記録される（1 日 1 回の制限は無い） |
| 仮眠中にアプリが強制終了された | `wakeAt` を 30 分過ぎた `NapSession` は読み出し時に無視・掃除。再ログイン時も「仮眠中」フラグは付いてこない |
| ネットワーク断 | 再試行つきの接続エラービュー。`POST /naps` に失敗した場合はホームへ戻る |

---

## 3. チームのフロー

### 3.1 作る / 参加する

```text
 /home（チーム未所属の表示）または /team
        │
        ├── [チームを作る] ──▶ /team/create
        │        POST /teams { name } → 201
        │        作成者が owner。招待コード NAP-1000〜NAP-9999 を採番
        │        ──▶ /team/invite（コードを見せて共有する）
        │
        └── [参加する] ────▶ /team/join
                 POST /teams/join { inviteCode }
                 大文字小文字・ハイフンを無視して照合（"nap4821" = "NAP-4821"）
                 ──▶ 既存メンバー全員へ member_joined 通知
                 ──▶ /team
```

| 失敗 | 応答 |
| --- | --- |
| 既にどこかのチームに所属している | 409（1 ユーザー 1 チーム） |
| コードが存在しない | 404 |

### 3.2 チーム画面（日常）

```text
 (tabs)/team
   GET /teams/summary   今週の達成率 / 前週差 / 日次バー / 提案文
   GET /settings/team   メンバー一覧・招待コード・canManage
   WS  member-status    在席がリアルタイムに書き換わる
   ─────────────────────────────────────────────
   [仮眠中 2人] [作業中 3人]
   メンバー行 ──▶ /members/[id]
   [メンバー管理] ─▶ /settings/team-members （owner のみ削除ボタン）
   [ランキング] ──▶ /team/ranking（今週の休息スコア降順）
   [N分仮眠を提案] ─▶ POST /teams/nap-suggestion { minutes }  5〜60、既定15
                       自分以外の全員へ team_nap_suggestion 通知
```

### 3.3 メンバー詳細とナッジ

```text
 /members/[id]
   GET /teams/members/:id
     ├ 在席ステータス
     ├ 仮眠中なら「あと◯分」＋ 起床予定時刻（NapSession 由来）
     └ 起床サポート ON/OFF
   [起きて〜] ─▶ POST /teams/members/:id/wake  → 相手へ wake_request 通知
   [休んでね] ─▶ POST /teams/members/:id/rest  → 相手へ rest_request 通知
```

| 失敗 | 応答 |
| --- | --- |
| 自分自身へのナッジ / 別チームの相手 | 400 |
| 相手が起床サポート OFF で「起きて」 | 409 |
| 送信者・相手がチーム未所属 | 404 |

> ナッジは**通知として届くだけで履歴は残さない**（送った事実は永続化しない）。

### 3.4 在席ステータスはどう決まるか

第一根拠は**開いている WebSocket**、第二が `lastSeenAt` の減衰。

| 条件 | 表示 |
| --- | --- |
| socket 接続中 | `activity` に従う（作業中 / 仮眠中） |
| 5 分間無反応 | オフライン |
| 仮眠中になってから 2 時間以内 | 仮眠中 |
| 2 時間を超えた仮眠中 | オフライン（放置された仮眠が永久に残らない） |
| socket 切断から 45 秒後 | オフライン |
| サインアウト | 即オフライン |

20 秒ごとの sweep が各チームを再計算し、**実際に変化したときだけ** push する。
これが無いと「アプリを閉じた人が他人の画面でずっと作業中のまま」になる。

### 3.5 抜ける / 抜けさせる

```text
 /settings/team ──[チームを退出]──▶ POST /settings/team/leave
     ├ 最後の1人だった → チーム自体も削除
     └ owner だった    → 最古参メンバーへ owner を委譲

 /settings/team-members（owner のみ）──[削除]──▶ DELETE /teams/members/:id
     二段階確認 → 対象へ通知 ＋ socket 切断 ＋ 全員へ在席を再配信
     自分・他の owner は削除できない（400）／ owner 以外が呼ぶと 403
```

---

## 4. 通知のフロー

```text
 発火（サーバ）                     配信                       受信（画面）
 ─────────────                    ─────                      ───────────
 ナッジ送信          ┐
 チーム参加          │   ①realtime socket ──▶ 即時・通知権限不要・Webでも届く
 メンバー削除        ├─▶ Notification 行    （唯一の Web 向け即時経路）
 チーム仮眠提案      │   （Postgres に永続化）
 仮眠の終了          │   ②Expo プッシュ ────▶ 実機 ＋ 通知許可 ＋ オプトイン時のみ
 週次ふりかえり      ┘   ③再取得 ──────────▶ 画面マウント時 / 前景復帰時（取りこぼしの保険）

 (tabs)/* のベルアイコン ──▶ /notifications
     GET /notifications        新しい順。初回は welcome を遅延 seed
     POST /notifications/:id/read ／ POST /notifications/read-all
```

| 種類 | 宛先 |
| --- | --- |
| `welcome` | 初回読み出し時に本人へ 1 件 |
| `wake_request` / `rest_request` | ナッジされた本人 |
| `member_joined` | 参加前からいた各メンバー（参加者本人には積まない）/ 除名された本人 |
| `team_nap_suggestion` | 提案者以外の全メンバー |
| `nap_ended` | 仮眠が予定時刻に達した本人。**サーバからのプッシュは抑止**（端末のローカルアラームが既に鳴っているため、同じ仮眠で 2 回鳴らさない） |
| `weekly_review` | 全ユーザー（月曜 9:00 JST 以降、週 1 回） |

相対時刻（「たった今」「2 分前」…）は**読み出し時に毎回導出**する。socket 経由で
届いた項目は id で重複排除して先頭に挿入するので、再取得と競合しても二重に並ばない。

---

## 5. スケジュールのフロー

```text
 (tabs)/schedule
   GET /schedule/day?date=YYYY-MM-DD
     ├ 次の空き時間（「5人中3人が予定なし」）
     ├ その日の予定一覧
     └ 週の予定件数・仮眠した日数
   [＋] / 予定行 ──▶ /schedule/event
        POST /schedule/events ／ PUT /schedule/events/:id ／ DELETE …
   予定の隙間 ──▶ 15分以上のものが休息判定（§2）の入力になる
```

**カレンダー連携**（`/settings/calendar`）

```text
  Google 連携あり ─▶ POST /settings/calendar/google/sync    実 API・増分同期
                      （syncToken、410 でフル再同期、トークン自動更新）
                      ＋ 定期同期（既定15分）／ webhook ／ 前景復帰時（10分デバウンス）
  Google 未設定   ─▶ サンプル1週間分を取り込む（アプリは壊れない）
  連携解除        ─▶ POST /settings/calendar/google/disconnect
                      source: "google" の予定を全削除
```

取り込んだ予定は `source: "google"` ＋ `externalId` で洗い替えされるので、
手動で足した予定（`source: "manual"`）と混ざらない。

---

## 6. 統計のフロー

```text
 (tabs)/stats   GET /stats
   ┌ 個人 ─────────────────────────────────────────┐
   │ 今週の休息スコア（0–100）＋ 前週差             │
   │ 仮眠回数 / 平均時間 / 目覚め評価               │
   │ 集中度 before → after（deltaPt）               │
   │ 週次コンディション折れ線（日〜土、未来日は空）  │
   │ 直近の仮眠 ──▶ /naps/reflection                │
   └────────────────────────────────────────────────┘
   ┌ チーム（所属時のみ）──────────────────────────┐
   │ 達成率 / 達成人数 / 前週差                     │
   │ 全員が仮眠した日数 / チーム平均コンディション   │
   └────────────────────────────────────────────────┘
```

- **「今週」はカレンダー週（日曜〜土曜）**。ローリング 7 日でも月曜始まりでもない。
- 休息スコアは `仮眠回数×15 + 平均wakeStars×8 + 平均focusDelta` を 0–100 に
  クランプしたもの。**個人統計・チーム統計・ランキング・ホームのチームスコアが
  同じ式を共有する**ので、画面をまたいで数字が食い違わない。
- 記録が 0 件なら全指標 0 ＋「まだ仮眠の記録がありません」。

---

## 7. 設定のフロー

```text
 (tabs)/settings
   アカウント ─ アカウント情報    /settings/account        GET/PATCH /auth/me
              └ 睡眠スケジュール  /settings/sleep-schedule GET/POST /settings/sleep-schedule
   連携       ─ カレンダー連携    /settings/calendar       §5
   通知       ─ 仮眠の提案 / 仮眠の終了 / チームからの仮眠提案 / 起床サポート
                （その場でトグル → POST /settings/notifications）
   チーム     ─ チーム設定        /settings/team           名前変更・招待コード・退出
   　　　　　 └ ログアウト        POST /auth/logout ＋ DELETE /notifications/token
```

睡眠スケジュール・通知トグル・カレンダー連携状態は、**オンボーディングと同じ
`Onboarding` 行**（1 ユーザー 1 行）に保存される。だからオンボーディングで答えた
値と設定画面の表示が食い違わない。

---

## 8. 横断的な振る舞い

| 事象 | どの画面でも共通の挙動 |
| --- | --- |
| 401（セッション失効） | 自動サインアウト → `/login` |
| ネットワーク到達不可 | 再試行ボタン付きの接続エラービュー |
| realtime の `invalidate` フレーム | 「読み直して」の合図のみ。クライアントは既存の REST で取り直す（データの真実を 2 経路に分けない） |
| 外部依存（Ollama / Google / Expo Push）の障害 | すべて best-effort。フォールバックして本体機能は止まらない |
| エラーメッセージ | ユーザー向けは日本語（`HttpError` → `errorHandler`） |

---

## 9. 関連ドキュメント

[requirements.md](./requirements.md) / [architecture.md](./architecture.md) /
[backend.md](./backend.md) / [auth.md](./auth.md) /
[team-feature.md](./team-feature.md) / [notifications.md](./notifications.md) /
[settings-architecture.md](./settings-architecture.md) /
[testing-guide.md](./testing-guide.md)
