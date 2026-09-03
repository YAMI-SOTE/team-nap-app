# Google 連携 設計アウトライン（未実装）

**現状**: Google ログインはスタブ（`mobile/src/services/authService.ts`
`signInWithGoogle` が例外を投げる）。カレンダー連携は OAuth を持たず、
`POST /settings/calendar/google/sync` が定型サンプル
（`backend/src/services/google-calendar-sample.ts`）を取り込むだけ。

このドキュメントは「本物にするなら」の設計。1 回の同意で **ログイン** と
**カレンダー読み取り** の両方を賄う。実装はまだ入れていない。

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

## 4. モバイル実装ポイント

- `mobile/src/services/authService.ts` `signInWithGoogle()` を実装。
  `expo-auth-session` の Google プロバイダ:

  ```ts
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId, androidClientId, webClientId,
    scopes: ["openid", "email", "profile",
             "https://www.googleapis.com/auth/calendar.events.readonly"],
    responseType: "code",          // ID トークンではなく code
    usePKCE: true,
    extraParams: { access_type: "offline", prompt: "consent" },
  });
  ```

  - `access_type=offline` + `prompt=consent` で **refresh_token を確実に**もらう。
  - 成功したら `code` と `request.codeVerifier` を
    `POST /auth/google { code, codeVerifier, redirectUri }` に渡し、返った
    `{ token, user }` を `AuthContext.signIn()`。
- ログイン / サインアップ画面の「Google でログイン」「Google で続ける」
  ボタンは既にあるので、`signInWithGoogle` に配線するだけ。
- Web は `expo-auth-session` がポップアップ / リダイレクトで処理。
- redirect URI:
  - dev: Expo proxy `https://auth.expo.io/@<owner>/team-nap`
  - prod（EAS ビルド）: カスタムスキーム `teamnap://redirect` ＋ web は
    デプロイ先 origin。Google Cloud Console の「承認済みリダイレクト URI」に
    すべて登録。

---

## 5. Google Cloud Console 設定

1. プロジェクト作成 → **OAuth 同意画面**（User type: External）。
2. スコープ: `openid` `email` `profile` ＋
   `.../auth/calendar.events.readonly`（イベント読み取りのみ・最小）。
   全カレンダー読むなら `.../auth/calendar.readonly`。
3. **OAuth クライアント ID** を種類別に作成: Web / iOS / Android
   （Expo は各プラットフォームの client ID を要求）。Web クライアントに
   client secret が付く（サーバーのみ）。
4. **同意画面の公開状態**:
   - Calendar は "sensitive scope" → 本番公開には **Google の審査**が要る
     （ブランド確認 ＋ 場合によりセキュリティ評価。数日〜数週間）。
   - ハッカソン中は同意画面を **"テスト" のまま**にし、**審査員の Google
     アカウントをテストユーザー（最大 100）に追加**する。これなら審査不要。
5. Calendar API を有効化。

環境変数（`backend/.env` / EAS）:

```env
GOOGLE_OAUTH_CLIENT_ID=...            # web client
GOOGLE_OAUTH_CLIENT_SECRET=...        # サーバーのみ
GOOGLE_OAUTH_REDIRECT_URI=...
GOOGLE_TOKEN_ENC_KEY=<32 byte base64> # refresh/access token の暗号化鍵
# mobile 側（EXPO_PUBLIC_*、client ID は秘密ではない）
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

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

## 9. 実装順（推奨）

1. `GoogleAccount` モデル + マイグレーション（`google-calendar-sample.ts` は残す）。
2. `POST /auth/google`（code 交換 + id_token 検証 + upsert + トークン暗号化保存）
   ＋ `session.service` でセッション発行。
3. モバイル `signInWithGoogle` 実装 → ログイン / サインアップのボタンに配線。
4. `google-calendar.service.ts`（イベント一覧・増分同期・トークン更新）。
   `syncGoogleCalendar` を実 API 呼び出しに差し替え（`GoogleAccount` 有無で分岐）。
5. フォアグラウンド同期 ＋ cron。必要なら `events.watch` の webhook。
6. 実データ検証後、サンプル取り込み経路はシード専用に固定。
