# テスト用アカウント

`npm run db:seed`（Compose なら `docker compose exec backend npm run db:seed`）で
投入されます。何度実行しても同じ状態に戻ります（upsert）。

> 機能ごとの手順は [testing-guide.md](./testing-guide.md) を参照。

---

## パスワード早見表

| アカウント群 | パスワード | チーム / 招待コード |
| --- | --- | --- |
| **審査員用 15 名**（`design*` / `dev*` / `sales*` `@teamnap.app`） | `judge2026` | デザイン部 / 開発部 / 営業部（`NAP-J001` 〜 `NAP-J003`） |
| `sample@teamnap.app` ほか `*@teamnap.app` 4 名 | `samplepass123` | サンプルチーム（`NAP-2001`） |
| `dev@teamnap.local` ほか `*@teamnap.local` 6 名 | `teamnap-dev` | TEAM NAP 開発チーム（`NAP-4821`） |

いずれも `npm run db:seed` で投入。全アカウント共通で、群ごとに 1 つのパスワードです。

> ### ⚠️ 1 アカウント = 1 端末
>
> **同じアカウントに 2 台目がログインすると、1 台目は即座にサインアウトされます。**
> 新しくログインした時点で、そのユーザーの既存セッションはすべて無効化されます
> （`session.service.ts` の `createSession`）。追い出された側は次の操作で
> 「別の端末でログインされたため、サインアウトされました」と表示されます。
>
> **審査員が複数人で同時に触る場合は、必ず別々のアカウントを使ってください。**
> そのために 15 名分を用意しています。同じアカウントを 2 人で使うと、
> 互いに相手をログアウトさせ続けることになります。

---

## 審査員用データセット（15 名 / 3 チーム）

`npm run db:seed`（全体）または `npm run db:seed:judges`（この 15 名だけ）で投入。
何度実行しても同じ状態に戻ります。

**全アカウント共通パスワード: `judge2026`**

すべてオンボーディング完了済み・チーム所属済みで、ログイン直後から
空の状態ではなく「動いているアプリ」が見えるようにしてあります。各アカウントに
今週＋先週の仮眠記録と、当該週 月〜金の予定（朝会 / 定例 / ランチ / レビュー）が
入っています。

### 3 チームは意図的に別々の状態にしてあります

スコアで文言が変わるので、データを編集しなくても 3 パターンを見比べられます。

| チーム | 招待コード | チームスコア | ホームの見出し |
| --- | --- | --- | --- |
| デザイン部 | `NAP-J001` | 95 | 「いい調子です」 |
| 開発部 | `NAP-J002` | 54 | 「まずまずです」 |
| 営業部 | `NAP-J003` | 23 | 「もうひと息です」 |

在席状態も 3 種類（作業中 / 仮眠中 / オフライン）が最初から混在しています。

### アカウント一覧

| チーム | メール | 名前 | 役割 | 在席 | 起床サポート |
| --- | --- | --- | --- | --- | --- |
| デザイン部 | `design1@teamnap.app` | 青木 美咲 | **owner** | 作業中 | on |
| デザイン部 | `design2@teamnap.app` | 石川 悠斗 | member | 仮眠中 | on |
| デザイン部 | `design3@teamnap.app` | 上田 かおり | member | 作業中 | **off** |
| デザイン部 | `design4@teamnap.app` | 遠藤 拓真 | member | オフライン | on |
| デザイン部 | `design5@teamnap.app` | 大西 結菜 | member | 作業中 | on |
| 開発部 | `dev1@teamnap.app` | 加藤 直樹 | **owner** | 作業中 | on |
| 開発部 | `dev2@teamnap.app` | 木下 彩 | member | 仮眠中 | on |
| 開発部 | `dev3@teamnap.app` | 小林 陽介 | member | オフライン | **off** |
| 開発部 | `dev4@teamnap.app` | 佐々木 楓 | member | 作業中 | on |
| 開発部 | `dev5@teamnap.app` | 斉藤 健 | member | 作業中 | on |
| 営業部 | `sales1@teamnap.app` | 髙橋 玲奈 | **owner** | 作業中 | on |
| 営業部 | `sales2@teamnap.app` | 谷口 亮 | member | オフライン | on |
| 営業部 | `sales3@teamnap.app` | 中村 さくら | member | 作業中 | **off** |
| 営業部 | `sales4@teamnap.app` | 野村 大輔 | member | オフライン | on |
| 営業部 | `sales5@teamnap.app` | 橋本 千尋 | member | 作業中 | on |

- **owner** のアカウントだけがチーム名の変更とメンバー削除をできます。
- **起床サポート off** のメンバーに「起きて〜」を送ると 409 が返ります
  （仕様どおりの拒否。エラー表示の確認に使えます）。
- 在席は時間で減衰します。シード直後は上表のとおりですが、しばらく誰も
  ログインしないと「オフライン」に落ちていきます（仕様）。実際にログインすれば
  即座に「作業中」に戻ります。

### おすすめの触り方（複数人で）

1. 審査員 A が `design1@teamnap.app`、審査員 B が `design2@teamnap.app` で
   **別々の端末**からログイン（同じアカウントは不可 — 上の警告を参照）。
2. B が「仮眠する」を開くと、A の画面のメンバー一覧が**リロード無しで**
   「仮眠中」に変わります（WebSocket）。
3. A から B に「起きて〜」を送ると、B の通知に即座に届きます。
4. B が仮眠を終えると、A 側の在席表示が戻ります。

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
