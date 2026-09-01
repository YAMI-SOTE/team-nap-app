# テスト用アカウント

`npm run db:seed`（Compose なら `docker compose exec backend npm run db:seed`）で
投入されます。何度実行しても同じ状態に戻ります（upsert）。

> 機能ごとの手順は [testing-guide.md](./testing-guide.md) を参照。

---

## サンプルチーム（複数メンバー・チーム機能テスト用）

チーム **サンプルチーム**（招待コード `NAP-2001`）に 4 人。全員パスワード
`samplepass123`、全員オンボーディング完了済み。別々の端末 / ブラウザで
それぞれログインすれば、メンバー一覧・ステータス表示・ナッジ・仮眠提案・
ランキングを実データで確認できます。

| メール | 名前 | 在席 (activity) | 起床サポート |
| --- | --- | --- | --- |
| `sample@teamnap.app` | サンプル 太郎 | online（作業中） | on |
| `hanako@teamnap.app` | サンプル 花子 | resting（仮眠中） | on |
| `jiro@teamnap.app` | サンプル 次郎 | online（作業中） | **off** ← wake ナッジは 409 |
| `saburo@teamnap.app` | サンプル 三郎 | resting（仮眠中） | on |

```bash
curl -s -XPOST http://localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"sample@teamnap.app","password":"samplepass123"}'
# => { "token": "...", "user": { "id", "name", "email", "onboardingCompleted": true } }
```

### 他のシードアカウント

`dev@teamnap.local` ほか `*@teamnap.local` 6 名は共通パスワード `teamnap-dev`、
チーム `TEAM NAP 開発チーム`（`NAP-4821`）。`dev@teamnap.local` はオンボーディング
完了済み、他はオンボーディング行なし（初回ログインで質問画面へ誘導される確認用）。

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
- 予定は「予定を追加」から手動で作成すると表示されます
- 仮眠を記録すると統計・履歴・グラフに反映されます（`NapRecord` テーブル、
  すべて実データ由来）

### `sample@teamnap.app`（サンプル 太郎）は仮眠履歴つき

統計・履歴・グラフをすぐ確認できるよう、この 1 アカウントだけシードで
**今週＋先週の仮眠記録**（合計 8 件前後、日付は実行時の週に合わせて生成）を
入れています。

- 統計（個人）→ 今週の仮眠スコア／平均仮眠時間／目覚めの良さ、「今週の
  コンディション」の折れ線（縦軸＝その日の仮眠スコア 0–100）、「先週より +N回」
  の差分、「最近の仮眠」の行
- 仮眠履歴（統計 →「すべて見る」）→ 日付ごとに一覧、水曜など 1 日に 2 件ある日も
- 各記録に `aiAdvice`（`buildAdvice()` で生成）が入っているので、行の矢印から
  ふりかえり画面でアドバイスを読み返せます
- `npm run db:seed` は再実行可能（このアカウントの `NapRecord` を毎回作り直します）

他のサンプルメンバー（花子／次郎／三郎）や新規アカウントには仮眠記録は入りません。

`schedule.service` / `notifications.service` は引き続き全体共有のインメモリで
サーバ再起動でリセットされます（`NapRecord` は Postgres に永続化）。
