# 認証・セッション・オンボーディング（バックエンド）

`feature/authentication-system` で入れた認証まわりの実装まとめ。
Google サインイン（`POST /auth/google` / `/auth/google/link`）は
[google-integration.md](./google-integration.md) 参照。関連:
[db.md](./db.md) / [team-feature.md](./team-feature.md)

---

## 1. 全体像

```text
[ ルート ]  src/routes/auth.routes.ts        /api/v1/auth/*
            src/routes/onboarding.routes.ts  /api/v1/onboarding/*（authenticate 必須）
   |
[ ミドルウェア ] src/middleware/authenticate.middleware.ts
   |   Authorization: Bearer <token> → Session を引く → req.auth = { userId, sessionId }
[ サービス ] auth.service / session.service / password-reset.service / onboarding.service
   |   Prisma
[ DB ] User / Session / PasswordResetToken / Onboarding
```

- トークンは **不透明なランダム文字列**。DB には `sha256(token)` のみ保存。
- 認証が必要なルートは `router.use(authenticate)` か個別に `authenticate` を付与。
  ハンドラ内は `requireUserId(req)` / `requireSessionId(req)`。

---

## 2. エンドポイント一覧

### 認証（`/api/v1/auth`）

| メソッド / パス | 認証 | body / 説明 |
| --- | --- | --- |
| `POST /signup` | – | `{ name, email, password }` → 201 `{ token, user }`。`password` は 8 文字以上。既存メールは 409（旧 `ensureUser` 由来のパスワード無しアカウントは引き継ぎ可） |
| `POST /login` | – | `{ email, password }` → 200 `{ token, user }`。失敗は 401（存在有無で文言を変えない） |
| `GET /me` | Bearer | `{ user }` |
| `PATCH /me` | Bearer | `{ name?, email?, avatar? }`（1 項目以上）→ `{ user }`。`avatar` は `cat`｜`man`｜`woman`｜`null`。メール重複は 409 |
| `POST /password` | Bearer | `{ currentPassword, newPassword }` → `{ revokedOtherSessions }`。現在のセッションは残し他を失効。現行 PW 誤りは 400 |
| `GET /sessions` | Bearer | 有効セッション一覧。呼び出し中のものは `current: true` |
| `DELETE /sessions/:id` | Bearer | 1 セッション失効 → 204（自分の有効セッションでなければ 404） |
| `POST /logout` | Bearer | 現在のセッションを失効 → 204 |
| `POST /logout-others` | Bearer | 他の全セッションを失効 → `{ revoked }` |
| `POST /password-reset/request` | – | `{ email }` → 常に 202 `{ ok }`（存在秘匿）。本番以外は `resetToken` も返す。トークンは常にサーバログに出力 |
| `POST /password-reset/confirm` | – | `{ token, password }` → 204。単回・期限付き。成功で **全セッション失効**。無効/使用済/期限切れは 400 |

`user` は毎回 `{ id, name, avatar, email, onboardingCompleted }`
（`avatar` は選択アイコン ID `cat`｜`man`｜`woman`、未選択は `null`）。

### オンボーディング（`/api/v1/onboarding`、すべて Bearer）

| メソッド / パス | body | 説明 |
| --- | --- | --- |
| `GET /` | – | `{ completed, bedtime, wakeTime, calendarConnected, notificationsEnabled, completedAt }`。行が無ければデフォルトで遅延作成 |
| `PUT /` | 4 項目の任意の部分集合 | 途中保存。完了にはしない |
| `POST /complete` | `{ bedtime, wakeTime, calendarConnected?, notificationsEnabled?, avatar? }` | 初回のみ `completedAt` を刻む。以降は冪等（回答だけ更新）。`avatar`（`cat`｜`man`｜`woman`｜`null`）は `User.avatar` に保存 |

`bedtime` / `wakeTime` は zod で「就寝→起床が 16 時間以内」を検証（`lib/sleep-window.ts`。
`/settings/sleep-schedule` と同じルール）。`Onboarding` 行は設定画面
（睡眠 / 通知 / カレンダー）の保存先も兼ねる（`db.md` 参照）。

---

## 3. セッション（トークン）

- 発行: `signup` / `login` / `password-reset` 後などに `session.service.createSession`。
- 検証: `authenticate` が `sha256(token)` で `Session` を引き、`revokedAt == null`
  かつ `expiresAt > now` のみ有効。毎リクエストで `lastUsedAt` を best-effort 更新。
- 失効: `logout` / `logout-others` / `DELETE /sessions/:id` /
  パスワード変更・再設定（変更時は現在のセッションを残す、再設定時は全失効）。
- TTL: `SESSION_TTL_HOURS`（既定 720＝30日）。

### 1 アカウント = 1 端末（**先にログインしている端末が勝つ**）

**`createSession` は、生きているセッションが既にあれば新しいセッションを発行せず
409 で断る。** 後からログインしようとした端末が弾かれ、**既にログインしている端末は
そのまま**。

```
端末A ログイン            → 200（トークン発行）
端末B ログイン            → 409 すでに別の端末でログインしています…
端末A                     → 変わらず有効
端末A サインアウト → 端末B ログイン → 200
```

- 実装位置は各呼び出し側ではなく `createSession` の中。メールログイン /
  サインアップ / Google ログインが自動的に揃い、今後追加される発行経路も
  勝手にこの規則に従う。
- 存在チェックと insert は**同一トランザクション**。1 クライアントがチェックを
  すり抜けて 2 本目を作ることはない。厳密に同時刻の 2 クライアントは既定の
  分離レベルでは通りうるが、その結果は「セッションが 2 本」＝以前の挙動であって
  セッションが消えるわけではない。
- 409 のメッセージはそのままクライアントに出る（`ApiError` → `AuthError` →
  ログイン画面のエラー表示）。追加のハンドリングは不要。

#### 締め出されたときの戻り方

意図的に「後から来た端末を断る」ので、**手元の端末からサインアウトできない状態**
（端末紛失・ストレージ消去・別ブラウザ）だと入れなくなる。逃げ道は 3 つ:

1. 元の端末でサインアウト（`POST /auth/logout`）
2. 元の端末から `POST /auth/logout-others`
3. **パスワード再設定** — `confirmReset` が全セッションを revoke する
   （`password-reset.service`）。端末に触れないときはこれ。

放っておいても `SESSION_TTL_HOURS`（既定 720＝30日）で失効する。

#### この規則が変えた他の挙動

- 401 の `revoked` メッセージは「このセッションは無効になっています。もう一度
  ログインしてください」。**別端末に乗っ取られることはもう無い**ので、以前の
  「別の端末でログインされたため…」は事実と合わなくなった。`revoked` になるのは
  サインアウト / `logout-others` / パスワード再設定 / アカウント削除のとき。
- ログイン時に古い端末のソケットを切る処理（`closeUserSockets(..., "signed in on
  another device")`）は削除。切る相手がいない。
- `logout-others` と `GET /sessions` は実質無意味（常に 0 件 / 1 件）だが、
  上の「戻り方 2」で使えるので残してある。
- **複数人で同時にテストする場合は必ず別アカウントを使うこと。** 審査員用に
  15 アカウント用意してある → [test-account.md](./test-account.md)。

---

## 4. パスワード

- 保存は scrypt（`src/lib/password.ts`、`scrypt$<salt>$<hash>`、定数時間比較）。
- **再設定**（未ログイン）: `request` → メール送信基盤が無いのでトークンをログ出力
  （＋非本番はレスポンスにも）→ `confirm` で更新＋全セッション失効。
  TTL は `PASSWORD_RESET_TTL_MINUTES`（既定 60）。
- **変更**（ログイン中）: `POST /auth/password`。現行 PW を確認し、他セッションを失効。

---

## 5. オンボーディングのシーケンス

**アカウント作成が先、その後にオンボーディング質問**。

```text
サインアップ / ログイン
   │  user.onboardingCompleted
   ├─ true  ─────────────▶ ホーム
   └─ false ─▶ GET /onboarding（無ければデフォルト作成）
                 │
                 ▼
        オンボーディング質問（睡眠リズム→カレンダー→通知）
                 │  途中は PUT /onboarding で保存（任意）
                 ▼
        POST /onboarding/complete  → completedAt 記録
                 │
                 ▼
               ホーム
```

- **デフォルト保存**: サインアップ時に `Onboarding` 行をデフォルト値で作成
  （`bedtime 23:30` / `wakeTime 07:30` / opt-in は false）。
- **バックフィル**: オンボーディング導入前のユーザー（シード等）は行が無い。
  `GET /onboarding` が初回アクセスでデフォルト行を作り `completed: false` を返すので、
  そのままオンボーディングに誘導される（＝この段階を必ず通す）。
- シード: `dev@teamnap.local` は完了済み（復帰ユーザー扱い）、他のシードユーザーは
  行なし（バックフィル経路の確認用）。

---

## 6. フロント連携（実装済み）

モバイル側は接続済み：

- `mobile/src/services/api.ts` はサインイン後 `Authorization: Bearer <token>` を付与
  （`X-User-Id` フォールバックは残っているが、全 `/api/v1` が `authenticate`
  必須になったため実質未使用）
- `authStorage`（expo-secure-store / Web は localStorage）＋ `AuthContext`
  （`status` / `user` / `signIn` / `signOut` / `deleteAccount` / `refresh`）＋
  401 で自動サインアウト
- 起動時 `GET /auth/me` → `onboardingCompleted` で `home` か `onboarding` へ
- 画面順は「**サインアップ → オンボーディング → ホーム**」。オンボーディングは
  `useAuth().status` で未ログインなら `/signup` に戻す
- サインイン時に Expo プッシュトークンを登録、サインアウト時に解除
  （[notifications.md](./notifications.md)）

Google サインイン: `POST /auth/google`（code + PKCE → id_token 検証 →
upsert/link → セッション発行、`/auth/login` と同形）。実装詳細と Google Cloud
Console 設定は [google-integration.md](./google-integration.md)。client id 未設定なら
従来どおりボタンは「現在ご利用いただけません」。

未対応: `logout-others` / セッション一覧の UI。

---

## 7. 動作確認（curl）

```bash
B=http://localhost:3000/api/v1

# 登録 → トークン
TOK=$(curl -s -XPOST $B/auth/signup -H 'content-type: application/json' \
  -d '{"name":"テスト","email":"t@example.com","password":"password123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
AUTH="authorization: Bearer $TOK"

curl -s $B/auth/me -H "$AUTH"                # onboardingCompleted:false
curl -s $B/onboarding -H "$AUTH"             # デフォルト行
curl -s -XPOST $B/onboarding/complete -H "$AUTH" -H 'content-type: application/json' \
  -d '{"bedtime":"23:30","wakeTime":"07:00","notificationsEnabled":true}'
curl -s $B/auth/me -H "$AUTH"                # onboardingCompleted:true

# パスワード再設定（非本番は resetToken が返る）
RT=$(curl -s -XPOST $B/auth/password-reset/request -H 'content-type: application/json' \
  -d '{"email":"t@example.com"}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("resetToken",""))')
curl -s -XPOST $B/auth/password-reset/confirm -H 'content-type: application/json' \
  -d "{\"token\":\"$RT\",\"password\":\"newpassword123\"}"   # 204、旧セッション失効
```

シードユーザーは `dev@teamnap.local` / `teamnap-dev`（`npm run db:seed`）。
