# テスト用アカウント

`npm run db:seed`（Compose なら `docker compose exec backend npm run db:seed`）で
投入されます。何度実行しても同じ状態に戻ります（upsert）。

> 機能ごとの手順は [testing-guide.md](./testing-guide.md) を参照。

---

## パスワード早見表

| アカウント群 | パスワード | チーム / 招待コード |
| --- | --- | --- |
| `sample@teamnap.app` ほか `*@teamnap.app` 4 名 | `samplepass123` | サンプルチーム（`NAP-2001`） |
| `dev@teamnap.local` ほか `*@teamnap.local` 6 名 | `teamnap-dev` | TEAM NAP 開発チーム（`NAP-4821`） |

いずれも `npm run db:seed` で投入。全アカウント共通で、群ごとに 1 つのパスワードです。

---

## サンプルチーム（複数メンバー・チーム機能テスト用）

チーム **サンプルチーム**（招待コード `NAP-2001`）に 4 人。全員パスワード
**`samplepass123`**、全員オンボーディング完了済み。別々の端末 / ブラウザで
それぞれログインすれば、メンバー一覧・ステータス表示・**在席のライブ更新
（WebSocket）**・メンバー管理・ナッジ・仮眠提案・ランキングを確認できます。

| メール | パスワード | 名前 | 役割 | 在席 (activity) | 起床サポート |
| --- | --- | --- | --- | --- | --- |
| `sample@teamnap.app` | `samplepass123` | サンプル 太郎 | **owner** | online（作業中） | on |
| `hanako@teamnap.app` | `samplepass123` | サンプル 花子 | member | resting（仮眠中） | on |
| `jiro@teamnap.app` | `samplepass123` | サンプル 次郎 | member | online（作業中） | **off** ← wake ナッジは 409 |
| `saburo@teamnap.app` | `samplepass123` | サンプル 三郎 | member | resting（仮眠中） | on |

太郎だけがオーナーなので、`設定 > チーム設定 > メンバーを管理` で他 3 人を
削除できます（`testing-guide.md` 4b）。在席のライブ更新は 4a を参照。

```bash
curl -s -XPOST http://localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"sample@teamnap.app","password":"samplepass123"}'
# => { "token": "...", "user": { "id", "name", "email", "onboardingCompleted": true } }
```

### 他のシードアカウント（`*@teamnap.local`）

チーム `TEAM NAP 開発チーム`（招待コード `NAP-4821`）。全員パスワード
**`teamnap-dev`**。`dev@teamnap.local` はオンボーディング完了済み、他の 5 名は
オンボーディング行なし（初回ログインで質問画面へ誘導される確認用）。

| メール | パスワード | 名前 | オンボーディング |
| --- | --- | --- | --- |
| `dev@teamnap.local` | `teamnap-dev` | あなた | 完了済み |
| `b@teamnap.local` | `teamnap-dev` | 佐藤 | 未（質問画面へ） |
| `c@teamnap.local` | `teamnap-dev` | 鈴木 | 未（質問画面へ） |
| `d@teamnap.local` | `teamnap-dev` | 高橋 | 未（質問画面へ） |
| `e@teamnap.local` | `teamnap-dev` | 田中 | 未（質問画面へ） |
| `f@teamnap.local` | `teamnap-dev` | 渡辺 | 未（質問画面へ） |

---

## ハッシュ化パスワードの確認（開発時のみ）

`NODE_ENV !== production` のとき `GET /api/v1/auth/debug` が有効（要 Bearer）。

```bash
TOKEN=... # 上記ログインの token
curl -s http://localhost:3000/api/v1/auth/debug -H "authorization: Bearer $TOKEN"
```

```json
{
  "user": { "...": "..." },
  "passwordHash": "scrypt$<salt(hex)>$<hash(hex)>",
  "passwordHashAlgorithm": "scrypt",
  "activeSessions": 1
}
```

生パスワードは DB に一切保存されず、`scrypt`（ソルト付き）のみ。ログインは
このハッシュとの定数時間比較で検証されます。

---

## プロフィール更新（表示名・メール）

`PATCH /api/v1/auth/me`（要 Bearer）。`name` / `email` の一方または両方。

```bash
curl -s -XPATCH http://localhost:3000/api/v1/auth/me \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"サンプル 花子"}'
```

- メールは正規化（小文字化）され、他ユーザーと重複すると **409**。
- 「メールを2回入力させる」確認はクライアント側で行い、API には最終値のみ送ります。
  （設定 > アカウント情報：メール変更時に確認フィールドが出る）

## アカウント削除

`DELETE /api/v1/auth/me`（要 Bearer）→ 204。チームを離脱してから `User` を削除し、
セッション / オンボーディング / リセットトークンは cascade で消えます。
アプリでは「設定 > アカウント情報 > アカウントを削除」で、二段階確認
（1回目でボタンが「完全に削除する」に変わり、2回目で確定）。ログアウトも
同じ二段階確認を使います。

---

## スケジュール・仮眠履歴の初期状態

**新規登録したアカウントは空**から始まります（カレンダー未連携・予定なし・
過去の仮眠記録なし）。

- スケジュール画面 → 「今日の予定はありません」の空状態
- 統計（個人）→ 「まだ仮眠の記録がありません」の空状態、各数値は 0
- 予定は「予定を追加」から手動で、または設定 > カレンダー連携の
  「今すぐ同期」で Google のサンプル 1 週間分を取り込むと表示されます
- 仮眠を記録すると統計・履歴・グラフに反映されます（`NapRecord` テーブル、
  すべて実データ由来）

### `sample@teamnap.app`（サンプル 太郎）はスケジュール・仮眠履歴つき

- スケジュール: Google カレンダー**連携済み**の状態で、当週 1 週間分の
  サンプル予定（朝会・全体会議・研修（終日）など、`source: "google"`）＋
  手入力 2 件（`歯医者` / `ジム`、`source: "manual"`）が入っています。
  スケジュール画面で予定の追加・編集・削除、設定 > カレンダー連携で
  「今すぐ同期」（Google 予定を洗い替え）／「連携を解除」（Google 予定を削除、
  手入力は保持）を確認できます。`npm run db:seed` は毎回このアカウントの
  `CalendarEvent` を作り直します。

統計・履歴・グラフをすぐ確認できるよう、この 1 アカウントだけシードで
**今週＋先週の仮眠記録**（合計 8 件前後、日付は実行時の週に合わせて生成）を
入れています。

- 統計（個人）→ 今週の仮眠スコア／平均仮眠時間／目覚めの良さ、「今週の
  コンディション」の折れ線（縦軸＝その日の仮眠スコア 0–100）、「先週より +N回」
  の差分、「最近の仮眠」の行
- 仮眠履歴（統計 →「すべて見る」）→ 日付ごとに一覧、水曜など 1 日に 2 件ある日も
- 各記録に `aiAdvice`（生成済み）が入っているので、行の矢印からふりかえり画面で
  アドバイスを読み返せます
- `npm run db:seed` は再実行可能（このアカウントの `NapRecord` / `CalendarEvent`
  を毎回作り直します）

他のサンプルメンバー（花子／次郎／三郎）や新規アカウントには仮眠記録は入りません。
チームサマリー・ランキングも `NapRecord` 由来なので、サンプルチームで太郎だけが
上位に出ます。

すべてのデータ（`NapRecord` / `CalendarEvent` / 通知フィード / 設定）は Postgres
に永続化され、サーバ再起動をまたいでも残ります。
