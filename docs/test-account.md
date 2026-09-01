# テスト用アカウントとサンプルスケジュール

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

## サンプルスケジュール（2026年9月 第1〜2週）

`backend/src/services/schedule.service.ts` の `SEPTEMBER_SAMPLE`。スケジュールは
まだ全体共有のインメモリ（ユーザーごとではない）。`GET /api/v1/schedule/day?date=YYYY-MM-DD`
で確認できます。

| 日付 | 曜日 | 予定 |
| --- | --- | --- |
| 09-01 | 火 | 定例ミーティング 10:00–11:00 / レビュー会 15:00–16:00 |
| 09-02 | 水 | 1on1 13:00–13:30 |
| **09-03** | **木** | **予定なし（空き日 — チーム仮眠・空き時間テスト向け）** |
| 09-04 | 金 | スプリントプランニング 10:00–12:00 |
| **09-05 / 09-06** | **土日** | **予定なし** |
| 09-07 | 月 | 週次定例 09:30–10:30 / 設計相談 14:00–15:00 |
| 09-08 | 火 | 顧客MTG 11:00–12:00 |
| 09-09 | 水 | コードレビュー 16:00–17:00 |
| **09-10** | **木** | **予定なし（空き日）** |
| 09-11 | 金 | スプリント振り返り 15:00–16:00 |
| **09-12 / 09-13** | **土日** | **予定なし** |
| 09-14 | 月 | 週次定例 09:30–10:30 / デモ準備 13:00–14:30 |

空き日（09-03, 09-10, 週末）は「みんなが休める時間」系のテストに使ってください。
