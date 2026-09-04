# Google 連携（実装済み）

1 回の同意で **ログイン** と **カレンダー読み取り** の両方を賄う。
Authorization Code + PKCE。client secret はバックエンドのみが持つ。

## 実装状況

| 部分 | 状態 | 主なファイル |
| --- | --- | --- |
| スキーマ | ✅ `User.googleId` + `GoogleAccount`（トークンは AES-256-GCM） | `prisma/schema.prisma`、migration `20260904000000_google_account` |
| `POST /auth/google` | ✅ code 交換 + id_token 検証（JWKS / `node:crypto`）+ upsert/link + セッション発行 | `services/google-oauth.service.ts`、`services/google-auth.service.ts` |
| `POST /auth/google/link` | ✅ ログイン中に連携追加（新セッション無し） | 同上 |
| モバイル Sign-in | ✅ `expo-auth-session`（システムブラウザ）→ backend 交換。ログイン / 新規登録のボタンに配線済み | `services/googleAuth.ts`、`hooks/useLogin.ts` / `useSignUp.ts` |
| カレンダー実同期 | ✅ 増分（`syncToken`）+ `410`→フル再同期 + トークン自動更新。`GoogleAccount` があれば実 API、無ければ従来のサンプル | `services/google-calendar.service.ts` |
| events.watch webhook | ✅ `POST /webhooks/google-calendar`（`X-Goog-Channel-Token` 検証）→ 増分同期。`PUBLIC_BASE_URL` + `GOOGLE_WEBHOOK_TOKEN` 設定時のみ | `routes/webhooks.routes.ts`、`services/google-calendar.service.ts` |
| 定期同期 cron | ✅ `GOOGLE_CALENDAR_SYNC_MINUTES`（既定 15、0 で無効） | `jobs/google-calendar-sync.job.ts` |
| フォアグラウンド同期 | ✅ 起動 / 復帰時に 10 分デバウンスで増分（連携済みのみ） | `hooks/useForegroundCalendarSync.ts`、`POST /settings/calendar/google/refresh` |

**まだ必要な作業**: Google Cloud Console でプロジェクト / OAuth クライアント /
同意画面を作り、下記の環境変数を設定すること（§5）。未設定なら Google ログインは
「現在ご利用いただけません」と返り、カレンダーは従来どおりサンプルにフォールバック
する（アプリは壊れない）。

関連: [auth.md](./auth.md) / [settings-architecture.md](./settings-architecture.md) /
[db.md](./db.md)

---

## 1. 全体像

```text
Mobile (expo-auth-session)                     Backend                       Google
  ── Authorization Code + PKCE ───────────────────────────────────────────▶  consent
     scopes: openid email profile
             calendar.events.readonly
     access_type=offline, prompt=consent
  ◀── authorization code (redirect / Expo proxy) ──────────────────────────
  ── POST /api/v1/auth/google { code, codeVerifier, redirectUri } ──▶
                                              ── POST /token (code + secret + verifier) ──▶
                                              ◀── access_token / refresh_token / id_token ──
                                              verify id_token (JWKS, aud, iss, exp)
                                              upsert User + GoogleAccount(refresh_token 暗号化)
                                              createSession → 不透明トークン
  ◀── { token, user }  （/auth/login と同形） ──
  AuthContext.signIn(result)
```

- **アプリのセッション方式は変えない**。Google はあくまで「本人確認 +
  Calendar アクセス権」の入手経路で、発行するのは今と同じ
  `Session` 由来の不透明ベアラトークン。
- **Authorization Code + PKCE** を採用（ID トークンのみだと Calendar API を
  叩けないため）。client secret はサーバーのみが持つ。

---

## 2. スキーマ変更

### `User`

```prisma
model User {
  // ... 既存 ...
  googleId     String?  @unique   // Google の sub（安定 ID）
  // passwordHash は既に nullable — Google のみのユーザーはパスワード無し
  googleAccount GoogleAccount?
}
```

### 新モデル `GoogleAccount`

トークン blob を `User` から分離。「カレンダー連携解除」でこの行だけ消せる
（アカウントは残る）。

```prisma
model GoogleAccount {
  userId               String    @id
  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  googleId             String    @unique
  email                String
  scope                String                     // 付与された scope（スペース区切り）
  accessTokenEnc       String                     // AES-256-GCM で暗号化
  accessTokenExpiresAt DateTime
  refreshTokenEnc      String?                    // 同上。再同意まで保持
  calendarIds          String[]  @default(["primary"])
  syncToken            String?                    // Calendar 増分同期トークン
  connectedAt          DateTime  @default(now())
  lastSyncedAt         DateTime?
}
```

### `Onboarding`

`calendarConnected` は `GoogleAccount` の有無 ＋ scope に `calendar` 系が
含まれるかで導出できる。列は残してもよいが二重管理になるので
`settings.service` 側で計算する方向。

マイグレーションは 1 本（`google_account`）。`google-calendar-sample.ts` は
**シード専用**として残す（`sample@teamnap.app` が OAuth 無しでスケジュールを
持てるように）。

---

## 3. サインイン（`POST /api/v1/auth/google`）

### リクエスト / レスポンス

| | |
| --- | --- |
| body | `{ code, codeVerifier, redirectUri }` |
| 200 | `{ token, user }`（`/auth/login` と同形。`user` に `avatar` / `onboardingCompleted`） |
| 400 | code 交換失敗 / id_token 検証失敗 |
| 409 | 既存のパスワードアカウントとメール衝突で、かつ `email_verified: false` |

### サーバー処理

1. `POST https://oauth2.googleapis.com/token` に
   `grant_type=authorization_code`、`code`、`code_verifier`、`client_id`、
   `client_secret`、`redirect_uri` を送る → `access_token` /
   `refresh_token` / `id_token` / `expires_in`。
2. **`id_token`（JWT）を検証**: Google の JWKS
   （`https://www.googleapis.com/oauth2/v3/certs`）で署名検証、`aud` == 自分の
   client ID、`iss` in `{accounts.google.com, https://accounts.google.com}`、
   `exp` 未来。→ `sub` / `email` / `email_verified` / `name` / `picture`。
3. **ユーザーの upsert / リンク**:
   - `googleId (sub)` で既存ユーザーが見つかる → それ。
   - 見つからず、同じ `email` のパスワードユーザーがいる:
     - `email_verified: true` → `googleId` をそのユーザーに紐付け（リンク）。
     - `email_verified: false` → 409。「パスワードでログインしてから設定で
       連携してください」。
   - どちらも無い → `User` 新規作成（`passwordHash: null`、`name`、必要なら
     `avatar` は既存の 3 択に無いので `null`）。
4. `GoogleAccount` を upsert。`refresh_token` は **AES-256-GCM で暗号化**
   （鍵は `GOOGLE_TOKEN_ENC_KEY`）。`refresh_token` が返らない場合
   （再ログインで同意省略時）は既存の暗号化トークンを保持。
5. `createSession(userId)` → 不透明トークン発行（既存 `session.service`）。
6. `{ token, user: await getPublicUser(userId) }` を返す。

### アカウント連携（ログイン中・任意）

`POST /api/v1/auth/google/link`（Bearer 必須）— 新規セッションは発行せず、
現在のユーザーに `GoogleAccount` を追加するだけ。設定画面の「Google と連携」
から使う。

---

## 4. モバイル実装（`services/googleAuth.ts`）

`expo-auth-session` の低レベル `AuthRequest` を imperative に使用（フックでは
ないので `signInWithGoogle()` を普通の async 関数として呼べる）:

```ts
const request = new AuthSession.AuthRequest({
  clientId,                       // platform 別（ios / android / web）
  scopes: ["openid", "email", "profile",
           "https://www.googleapis.com/auth/calendar.events.readonly"],
  redirectUri,                    // makeRedirectUri({ scheme: "teamnap", path: "oauthredirect" })
  responseType: AuthSession.ResponseType.Code,
  usePKCE: true,
  extraParams: { access_type: "offline", prompt: "consent" },
});
await request.makeAuthUrlAsync(DISCOVERY);
const result = await request.promptAsync(DISCOVERY);
// result.params.code + request.codeVerifier を
// POST /auth/google { code, codeVerifier, redirectUri, clientId } へ。
```

- `access_type=offline` + `prompt=consent` で refresh_token を確実にもらう。
- 返った `{ token, user }` を `useLogin` / `useSignUp` が `AuthContext.signIn()`。
  ログイン / 新規登録画面の Google ボタンは元から `submitWithGoogle` に配線済み。
- Web は `expo-auth-session` がポップアップ / リダイレクトで処理
  （`WebBrowser.maybeCompleteAuthSession()` をモジュール読み込み時に呼ぶ）。
- **redirect URI**（このリポジトリの方針 = カスタムスキーム）:
  - iOS / Android（EAS ビルド）: `teamnap://oauthredirect`
    （アプリのスキームを `ASWebAuthenticationSession` が直接インターセプト。
    Info.plist / intent-filter の追加は不要）。
  - Web: アプリの origin（`makeRedirectUri` が返す。Web クライアントの
    「承認済みリダイレクト URI」に登録）。
  - バックエンドは受け取った `redirectUri` を `GOOGLE_OAUTH_REDIRECT_URIS`
    許可リストと照合してから Google と交換する。

---

## 5. Google Cloud Console 設定

1. プロジェクト作成 → **OAuth 同意画面**（User type: External）。
2. スコープ: `openid` `email` `profile` ＋
   `.../auth/calendar.events.readonly`（イベント読み取りのみ・最小）。
   全カレンダー読むなら `.../auth/calendar.readonly`。
3. **OAuth クライアント ID** を種類別に作成: Web / iOS / Android。
   - Web クライアント: `client_secret` が付く（サーバーのみ）。
     「承認済みリダイレクト URI」に web の origin（例
     `http://localhost:8081`、`http://localhost:19006`、デプロイ先）を登録。
   - iOS クライアント: バンドル ID `app.teamnap.mobile`。
   - Android クライアント: パッケージ名 `app.teamnap.mobile` ＋ 署名 SHA-1。
   - 交換時は **id_token の `aud` が上記いずれかの client id** であればよい
     （バックエンドは 3 つすべてを許容 audience にする）。ネイティブ
     クライアントは secret 無し（PKCE で保護）。
4. **同意画面の公開状態**:
   - Calendar は "sensitive scope" → 本番公開には **Google の審査**が要る
     （ブランド確認 ＋ 場合によりセキュリティ評価。数日〜数週間）。
   - ハッカソン中は同意画面を **"テスト" のまま**にし、**審査員の Google
     アカウントをテストユーザー（最大 100）に追加**する。これなら審査不要。
5. Calendar API を有効化。

環境変数（実際の名前は `backend/.env.example` / `mobile/.env.example` 参照）:

```env
# backend/.env — 最低 CLIENT_ID + TOKEN_ENC_KEY で有効化
GOOGLE_OAUTH_CLIENT_ID=xxxx.apps.googleusercontent.com   # web client（id_token audience）
GOOGLE_OAUTH_CLIENT_SECRET=xxxx                          # サーバーのみ
GOOGLE_OAUTH_IOS_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_OAUTH_ANDROID_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_OAUTH_REDIRECT_URIS=teamnap://oauthredirect,http://localhost:8081
GOOGLE_TOKEN_ENC_KEY=<32 byte base64>   # node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# webhook を使う場合のみ
PUBLIC_BASE_URL=https://<api-host>
GOOGLE_WEBHOOK_TOKEN=<long-random>
GOOGLE_CALENDAR_SYNC_MINUTES=15         # 既定。0 で cron 無効

# mobile/.env（EXPO_PUBLIC_*、client id は秘密ではない）
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxx.apps.googleusercontent.com
```

EAS ビルドでは `mobile/.env` は読まれない。`eas env:set --environment preview
--name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value ...` のように環境ごとに設定する。

---

## 6. カレンダー同期（実データ）

### 現状との差し替え

`settings.service.syncGoogleCalendar` は今
`replaceGoogleEvents(userId, googleSampleEvents())` を呼ぶ。これを
新 `google-calendar.service.ts` に差し替える（`GoogleAccount` があれば実 API、
無ければ従来のサンプル。フラグ `GOOGLE_CALENDAR_REAL=1` でも切替可）。

### `google-calendar.service.ts` の流れ

1. **アクセストークン確保**: `GoogleAccount` を読み、`accessTokenExpiresAt`
   が近ければ `POST /token`（`grant_type=refresh_token`）で更新して再暗号化保存。
   `invalid_grant`（ユーザーが権限取消）→ `GoogleAccount` を無効化し、
   フロントに「再連携が必要」を返す。
2. **イベント取得**:
   `GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events`
   - 初回 / フル同期: `timeMin`＝今週の開始、`timeMax`＝＋N 週、
     `singleEvents=true`（繰り返しを展開）、`maxResults=250`、`pageToken` で
     ページング。
   - 増分同期: 前回レスポンスの `nextSyncToken` を `syncToken` として渡す
     → 変更分のみ。`410 Gone` なら syncToken 失効 → フル同期し直し。
3. **マッピング** Google event → `CalendarEvent`:

   | Google | CalendarEvent |
   | --- | --- |
   | `id`（展開インスタンスは `id_20260904T...`） | `externalId`（安定・再同期の突合キー） |
   | `summary` | `title` |
   | `start.date` の有無 | `allDay` |
   | `start.dateTime` / `end.dateTime`（`start.timeZone` かカレンダー TZ で変換） | `date` / `start` / `end` |
   | `status: "cancelled"` | 該当 `externalId` の行を削除 |
   | — | `source: "google"` |

   保存する情報は **タイトルと時刻と終日フラグのみ**。参加者・説明・場所は
   保存しない。
4. **DB 反映**: 変更分を `CalendarEvent` に upsert（`@@unique([userId, externalId])`）、
   `cancelled` は delete。`source: "manual"` の行は一切触らない（既存挙動）。
5. `nextSyncToken` と `lastSyncedAt` を `GoogleAccount` に保存。

### 同期トリガー

| 方式 | 実装 | 用途 |
| --- | --- | --- |
| 手動 | `POST /settings/calendar/google/sync`（ボタンは既にある） | いつでも |
| フォアグラウンド時 | ホーム読み込み時にデバウンスして増分同期 | 通常運用 |
| 定期 | Backend の cron（連携ユーザーごと、例 15 分） | 取りこぼし防止 |
| Push（`events.watch`） | Google が変更時に `POST /api/v1/webhooks/google-calendar` → 増分同期。チャンネルは ~7 日で失効 → cron で更新 | 準リアルタイム（任意・後回し可） |

ハッカソン規模なら「手動 ＋ フォアグラウンド ＋ 15 分 cron」で十分。

### スコープと将来

- v1 は **読み取りのみ**（`calendar.events.readonly`）。空き時間検出に使う。
- 将来「仮眠枠をカレンダーに書き込む」なら `calendar.events`（書き込み）に
  拡張 → 追加同意が必要。

---

## 7. 既存機能への影響

- **空き時間 / 休息提案**: `schedule.service` は `CalendarEvent` を読むだけ
  なので、実イベントが入れば自動で反映される（コード変更不要）。
- **`/settings/calendar/google/disconnect`**: `GoogleAccount` 削除 ＋
  `source: "google"` の `CalendarEvent` 全削除（後者は既に実装済み）。
- **`google-calendar-sample.ts`**: シード専用に降格。`sample@teamnap.app` は
  引き続き OAuth 無しでスケジュールを持つ。
- **`CalendarIntegrationResponse`**（`settings.service`）: `google.email` /
  `google.lastSyncedLabel` を実 `GoogleAccount` から返す。型は不変。

---

## 8. セキュリティ / プライバシー

- **client secret はサーバーのみ**。モバイルには置かない（client ID は公開可）。
- **refresh / access token は保存時に暗号化**（AES-256-GCM、鍵は env / KMS）。
- 取得スコープは最小（`calendar.events.readonly`）。全カレンダー不要なら
  primary のみ。
- カレンダーの**中身は最小限だけ保存**（タイトル・時刻・終日）。説明・参加者・
  場所は保存しない。
- 連携解除で `GoogleAccount` と Google 由来イベントを完全削除。
- `id_token` は必ず署名 / `aud` / `iss` / `exp` を検証してから信用する。
- 本番の同意画面公開には Google 審査（sensitive scope）。ハッカソンは
  「テスト」モード ＋ テストユーザー登録で回避。

---

## 9. 実装順（完了済み）

1. ✅ `GoogleAccount` モデル + マイグレーション（`google-calendar-sample.ts` は
   フォールバックとして継続）。
2. ✅ `POST /auth/google`（code 交換 + id_token 検証 + upsert/link +
   トークン暗号化保存）＋ `session.service` でセッション発行。
3. ✅ モバイル `signInWithGoogle`（`services/googleAuth.ts`）→ ログイン /
   サインアップのボタンに配線。
4. ✅ `google-calendar.service.ts`（イベント一覧・増分同期・`410`→フル・
   トークン更新）。`settings.service.syncGoogleCalendar` を `GoogleAccount`
   有無で分岐。
5. ✅ フォアグラウンド同期（`useForegroundCalendarSync` +
   `/settings/calendar/google/refresh`）＋ 15 分 cron ＋ `events.watch` webhook。
6. ⏳ 残: Google Cloud Console の設定（§5）と、実アカウントでの E2E 確認。
   サンプル取り込みは `GoogleAccount` 未接続時のフォールバックとして残す方針
   （シード専用への固定は将来）。

### テスト

- `src/lib/secret-box.test.ts` — AES-256-GCM の往復 / 改竄検知 / 鍵長。
- `src/services/google-oauth.service.test.ts` — id_token クレーム検証（iss /
  aud / exp / skew）。
- `src/services/google-calendar.service.test.ts` — `mapGoogleEvent`（JST 変換 /
  終日 / 日跨ぎクランプ / cancelled → 削除 / タイトル欠落）。
