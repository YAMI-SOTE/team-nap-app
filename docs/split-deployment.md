# 分離デプロイ — Vercel フロント + VPS バックエンド（審査員向け公開構成）

審査員が **Tailscale に入らずに** Web からアプリを触れるようにするための構成。
DB・Ollama・Backend API は今の 8GB VPS に残し、**Web フロントだけ Vercel** に
出して独自ドメインを付ける。ネイティブ（EAS ビルド）も同じ公開 API を指す。

前提の VPS 手順は [setup.md「本番デプロイ（VPS）」](./setup.md#本番デプロイvps) に
あるので、ここでは **差分（公開・分離）だけ** を書く。Google 連携を使う場合は
[google-integration.md](./google-integration.md) も参照。

---

## 0. 結論（実現可能か）

**可能。標準的な構成で、追加コストは基本 $0。** 制約は 3 つだけ:

| 制約 | 対応 |
| --- | --- |
| Web ページが `https` なら WebSocket も `wss` 必須（mixed content 不可） | API を HTTPS で公開する（下の 3 案いずれも HTTPS） |
| `EXPO_PUBLIC_API_URL` は**ビルド時に焼き込まれる** | Vercel のビルド環境変数で設定（`.env` は読まれない） |
| 8GB では `gemma4:e2b`（〜7GB）は載らない | `OLLAMA_MODEL=gemma3:1b` にする、または Ollama を止めて定型文フォールバック |

Tailscale はそのまま **運用（SSH / DB 管理）専用**に残す。審査員トラフィックは
別経路（下記）で公開する。

---

## 1. 目標アーキテクチャ

```text
                 ┌───────────────────────────┐
  審査員のブラウザ ──https──▶│  Vercel (静的 SPA)        │  例: https://team-nap.example
                 │  expo export -p web → dist │
                 └────────────┬──────────────┘
                              │ https / wss   （EXPO_PUBLIC_API_URL）
                              ▼
                 ┌───────────────────────────┐
                 │  公開エンドポイント        │  例: https://api.example
                 │  Cloudflare Tunnel /       │
                 │  Tailscale Funnel / Caddy  │
                 └────────────┬──────────────┘
                              │ localhost / compose network
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  ┌───────────┐        ┌───────────┐         ┌───────────┐
  │ Backend   │──────▶ │ Postgres  │         │ Ollama    │
  │ :3000     │        │ :5432     │         │ :11434    │
  │ (Docker)  │        │ (Docker)  │         │ gemma3:1b │
  └───────────┘        └───────────┘         └───────────┘
        ▲
        │ Tailscale（SSH / 管理のみ・非公開）
   開発者マシン
```

- **Vercel** = 静的ファイル配信のみ。ロジックは無い（Expo Web は SPA）。
- **公開エンドポイント** = VPS 上の Backend `:3000` を外に出す層。3 案から 1 つ。
- **Postgres / Ollama は絶対に公開しない。** 公開層が触るのは `:3000` だけ。

---

## 2. API を公開する（3 案）

現状 Tailscale 経由でしか届かないので、ここが実質の作業。おすすめ順。

### 案 A（推奨）Cloudflare Tunnel — 独自ドメイン + 受信ポート開放なし

VPS から Cloudflare へ**外向き**トンネルを張るだけ。VPS の IP は隠れ、
ファイアウォールの受信穴を開けない。無料。WebSocket は素通し。

必要なもの: Cloudflare アカウントに登録したドメイン（無料プランで可）。

```bash
# VPS 上
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

cloudflared tunnel login                       # ブラウザで承認
cloudflared tunnel create teamnap-api          # 認証情報 JSON が ~/.cloudflared に
cloudflared tunnel route dns teamnap-api api.example.com
```

`~/.cloudflared/config.yml`:

```yaml
tunnel: teamnap-api
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: api.example.com
    service: http://localhost:3000      # cloudflared を compose に入れるなら http://backend:3000
  - service: http_status:404
```

常駐（systemd）:

```bash
cloudflared service install
systemctl enable --now cloudflared
journalctl -u cloudflared -f            # ログ
```

compose に同居させる場合（`ports:` 公開を全部消せる）:

```yaml
# compose.override.yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run
    restart: unless-stopped
    volumes:
      - ~/.cloudflared:/etc/cloudflared:ro
    depends_on: [backend]
```

- WebSocket（`/api/v1/realtime`）はそのまま通る。追加設定不要。
- Cloudflare の「WebSockets」設定が ON になっていること（既定 ON）。

### 案 B（最小手数）Tailscale Funnel — 自前ドメイン不要・HTTPS 自動

Tailnet のノードの 1 ポートをそのまま公開。証明書は Tailscale が自動発行。
ホスト名は `https://<node>.<tailnet>.ts.net` 固定（審査員には見えないので可）。

```bash
# tailnet の管理コンソール（Access controls）で Funnel を許可:
#   "nodeAttrs": [{ "target": ["tag:server"], "attr": ["funnel"] }]
tailscale funnel 3000                   # :3000 を https で公開
tailscale funnel status                 # 公開 URL を確認
```

- 独自ドメインは付かない（フロントのビルド変数に URL を入れるだけなので実害なし）。
- 少人数のデモには十分。大量アクセスや常時公開には向かない。
- 停止: `tailscale funnel reset`。

### 案 C（既存路線）Caddy + 443 開放 — [setup.md](./setup.md#3-リバースプロキシ--tls) のまま

VPS の 80/443 を開けて A レコードを VPS に向け、Caddy で TLS 終端。
[setup.md の Caddy 例](./setup.md#3-リバースプロキシ--tls) がそのまま使える。
VPS の IP が露出し、受信ポートを開ける点が A/B と違う。既にこの構成なら
フロントを Vercel に移すだけでよい。

> **補足**: フロントも VPS の Caddy で配信すれば Vercel すら不要（1 オリジン・
> CORS 不要）。ただし Vercel の CDN / push デプロイ / プレビュー URL は失う。
> 「独自ドメイン付きの手離れした Web ホスティング」が目的なら Vercel を使う。

---

## 3. フロントを Vercel に出す

Expo Web は **静的 SPA**（`app.json` に `web.output` 指定なし = `single`）。
Vercel は静的配信するだけ。

### 3.1 プロジェクト設定（Vercel ダッシュボード）

| 項目 | 値 | 備考 |
| --- | --- | --- |
| Root Directory | `mobile` | **ここだけダッシュボードでしか設定できない。** モノレポ（npm workspaces ではない）なので必須。「Edit」で `mobile` フォルダを選ぶ |
| Framework Preset | Other | |
| Build Command | （空でよい） | `mobile/vercel.json` の `buildCommand` が使われる（`npx expo export -p web`） |
| Output Directory | （空でよい） | 同上 → `dist` |
| Install Command | （空でよい） | 同上 → `npm install` |
| Node.js Version | 20 以上 | Settings → General。既定で可 |

### 3.2 `mobile/vercel.json`（リポジトリにコミット済み）

ビルド設定と SPA フォールバック（直リンク `/home` などで 404 にしない）を
ファイルで固定している。Vercel は Root Directory 直下の `vercel.json` を読む:

```json
{
  "framework": null,
  "installCommand": "npm install",
  "buildCommand": "npx expo export -p web",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

> 全許可のリライトだが、Vercel は**実在する静的ファイル**（`/_expo/static/...`
> など）を先に返し、ファイルが無いパスだけ `index.html` に書き換えるので安全。

### 3.3 ビルド環境変数（Production + Preview 両方）

`.env` は Vercel では読まれない。ダッシュボードの Environment Variables で:

```
EXPO_PUBLIC_API_URL = https://api.example.com/api/v1
# Google ログインを使うなら（任意）
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = xxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = xxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = xxxx.apps.googleusercontent.com
```

`ws://` は `mobile/src/services/realtime.ts` が `wss://` に自動置換するので、
`EXPO_PUBLIC_API_URL` が `https://` である限り WebSocket も TLS で繋がる。

### 3.4 ドメイン

- 無料の `*.vercel.app` をそのまま審査員に渡してよい。
- 独自ドメインを付ける場合: Vercel の Domains で追加 → 表示された CNAME /
  A レコードを DNS に登録。Cloudflare でドメインを管理しているなら
  そこに CNAME を足すだけ（案 A と同じゾーンで完結できる）。

> Vercel Hobby プランは非商用向け。ハッカソンのデモ利用は範囲内。気になる場合は
> Cloudflare Pages（同じく無料・静的）でも同手順で置き換え可能。

---

## 4. ネイティブ（EAS ビルド）も同じ API を指す

Web だけでなく iOS / Android の preview ビルドも公開 API を使えるようにする:

```bash
cd mobile
eas env:set --environment preview --name EXPO_PUBLIC_API_URL \
  --value https://api.example.com/api/v1
# 以降のビルドから反映
eas build --profile preview --platform all
```

配布方法（リンク配布 / Appetize / TestFlight）は
[device-testing.md](./device-testing.md) の §7 系を参照。

---

## 5. 公開 API のためのバックエンド調整

分離とは無関係でも、**外に晒す**なら入れておきたい設定。コードに手を入れる
ものは別 PR（このドキュメントは方針のみ）。

| 項目 | いま | 公開時の推奨 |
| --- | --- | --- |
| `NODE_ENV` | — | **`production`**（`/auth/debug`・リセットトークンのレスポンス露出が無効に。[setup.md](./setup.md#1-取得と環境設定)） |
| `OLLAMA_MODEL` | `gemma4:e2b` | **`gemma3:1b`**（8GB 制約。§6）または Ollama 停止 |
| Postgres `:5432` / Ollama `:11434` の publish | `compose.yaml` が公開 | **publish を外す**（`ports:` 削除）。案 A/B なら backend の `:3000` も外せる |
| CORS | `app.use(cors())`（全許可） | 既知オリジン（Vercel ドメイン + `localhost`）に絞る。`WEB_ORIGIN` 環境変数化 — 別 PR |
| レート制限 | 無し | 少なくとも `/auth/*` に `express-rate-limit` — 別 PR |
| `HOST` | `0.0.0.0` | 案 A/B（同ホストのトンネル）なら `127.0.0.1` でも可。Docker 網なら `0.0.0.0` のまま |
| ヘルスチェック | `GET /api/v1/health` | トンネル / uptime 監視のターゲットに |

Google 連携を使うなら:

- バックエンド `GOOGLE_OAUTH_REDIRECT_URIS` に **Vercel の URL** を追加。
- Google Cloud Console の Web OAuth クライアントの「承認済み JavaScript 生成元 /
  リダイレクト URI」に同じ Vercel URL を追加。
- 詳細は [google-integration.md §5](./google-integration.md#5-google-cloud-console-設定)。

---

## 6. 8GB VPS のメモリ試算

| コンポーネント | アイドル | デモ負荷時 |
| --- | --- | --- |
| OS + Docker + Tailscale | 〜0.4–0.7 GB | 同 |
| Postgres 17（デモ規模） | 〜0.2 GB | 〜0.3–0.5 GB |
| Backend（Node） | 〜0.12 GB | 〜0.2–0.35 GB |
| cloudflared / Caddy | 〜0.05 GB | 〜0.1 GB |
| Ollama + `gemma3:1b`（ロード時） | 〜0（未ロード） | 〜1.2–1.8 GB |
| **合計** | **〜1.5 GB** | **〜2.5–3.5 GB** |

→ 8GB なら余裕。**`gemma4:e2b` は使わない**（モデルだけで 7GB 超 → OOM kill、
AI がフォールバックに落ちるだけでなく他プロセスも巻き添え）。
CPU-only では `gemma4:e2b` は文字化けする既知問題もある（PR #58）。

デモ中の CPU スパイクが気になるなら **Ollama を止めて**定型文フォールバック運用が
一番安全（AI アドバイスは「ルールベース + 用意した文面」に自動で切り替わる）。
その場合 `OLLAMA_URL` を届かない値にするか ollama サービスを起動しない。

---

## 7. 審査当日ランブック

### 前日までに

1. `git pull && docker compose up -d --build`（VPS）。マイグレーションは
   起動時 `prisma migrate deploy` で自動。
2. トンネル / Funnel が **常駐サービス**として自動再起動する状態か確認
   （`systemctl status cloudflared` など）。
3. Vercel の Production デプロイが緑。`EXPO_PUBLIC_API_URL` が正しい値で
   焼かれているか、公開ページの Network タブで API 先を確認。
4. **携帯回線（Wi-Fi / tailnet ではない）** から一連の動作確認。

### スモークチェック（公開 URL で）

- [ ] `https://<vercel>` が HTTPS で開く
- [ ] `curl https://api.example.com/api/v1/health` が `{"status":"ok"}`
- [ ] サインアップ → オンボーディング → ホーム表示
- [ ] 別ブラウザでもログインし、在席ドット / ナッジがリアルタイム反映
      （DevTools Network に `wss://.../api/v1/realtime` が Open）
- [ ] 仮眠タイマー → 「仮眠中」が相手側に即反映
- [ ] AI アドバイスが出る（Ollama 稼働時）or 定型文が出る（停止時）
- [ ] カレンダー「今すぐ同期」でサンプル週が入る
- [ ] （設定していれば）Google ログイン

### つまずきポイント

| 症状 | 見るところ |
| --- | --- |
| 画面は出るが API が全滅（"Failed to fetch"） | 公開ページのビルドに `EXPO_PUBLIC_API_URL` が焼かれているか（ページソース検索）。`curl .../health`。トンネル稼働。 |
| API は動くがリアルタイムだけ死ぬ | Network に `ws://`（＝mixed content でブロック）が出ていないか → `EXPO_PUBLIC_API_URL` を `https://` に。トンネルの ingress が `/api/v1/realtime` を通すか。 |
| CORS エラー | `cors()` が有効か。CORS を絞った場合は許可リストに Vercel ドメインがあるか。 |
| Google ログインだけ失敗 | リダイレクト URI（Vercel の URL）が backend の許可リスト と Google Console の両方に登録済みか。 |
| 途中から重い / 落ちる | `docker stats`。`gemma4:e2b` を使っていないか。使っていれば `gemma3:1b` へ。 |

### フロントが API に繋がらないとき（詳細な切り分け）

原因はほぼ次の 3 層のどれか。**上から順に**確認する。

```text
① ビルドに API URL が入っているか   →  ② API が公開で生きているか   →  ③ ブラウザがブロックしていないか
   (Vercel の環境変数 + 再デプロイ)       (トンネル / backend コンテナ)      (mixed content / CORS / 証明書)
```

#### ① ビルドに `EXPO_PUBLIC_API_URL` が焼き込まれているか（いちばん多い）

`EXPO_PUBLIC_*` は**ビルド時に静的に埋め込まれる**。実行時の設定変更やランタイム
`.env` は効かない。

1. 公開ページを開く → DevTools → **Network** タブ → 何か操作（ログイン等）。
2. リクエストの宛先を見る:
   - `http://localhost:3000/...` や `http://10.x...` に飛んでいる
     → **環境変数が未設定のままビルドされた**（ローカル用の値が残っている）。
   - `undefined/auth/login` や、リクエストが即エラー（`ApiError` / 「接続先が
     設定されていません」）→ 環境変数が**空**。
   - `https://instance-...ts.net/api/v1/...` に飛んでいる → ① は OK。② へ。

**直し方**

1. Vercel → プロジェクト → **Settings → Environment Variables**。
   - `EXPO_PUBLIC_API_URL` = `https://<公開APIホスト>/api/v1`
     （末尾の `/api/v1` 必須・末尾スラッシュ**なし**）
   - スコープは **Production と Preview の両方**にチェック（Preview URL で
     試しているのに Production にしか入れていない、が定番ミス）。
2. **必ず再デプロイ**。環境変数を足しただけでは反映されない。
   Deployments → 最新 → **Redeploy**（ビルドキャッシュは使わない方が確実）。
   または `git commit --allow-empty -m "redeploy" && git push`。
3. 再度ページを開き、Network の宛先が新しい URL になっているか確認。
   ビルド成果物に URL が入ったかは、公開ページの JS を開いて
   `ts.net` などで検索しても確認できる。

> `mobile/.env` は Vercel では**読まれない**。値は必ずダッシュボードで設定する。

#### ② API 単体が「公開で」到達できるか

**Tailscale / VPN を切った端末**（スマホのモバイル回線など）で:

```bash
curl -i https://<公開APIホスト>/api/v1/health
```

| 結果 | 意味 / 対応 |
| --- | --- |
| `200` + `{"status":"ok",...}` | ② は OK。③ へ。 |
| つながらない / タイムアウト / `curl: (7)` | 公開経路が死んでいる。Tailscale Funnel なら VPS で `tailscale funnel status`（`/` が `http://127.0.0.1:3000` を指しているか）。指してなければ `sudo tailscale funnel --bg 3000`。Cloudflare Tunnel なら `journalctl -u cloudflared -f`。 |
| `502` / `503` | 経路は生きているが backend が落ちている。VPS で `docker compose ps` / `docker compose logs --tail=50 backend`。ローカル疎通 `curl http://127.0.0.1:3000/api/v1/health`。 |
| `404`（HTML が返る） | パスが違う。`/api/v1/health` になっているか（`/health` 単体ではない）。トンネルがルート `/` を丸ごと `:3000` に渡しているか。 |
| 証明書エラー（`curl` で `-k` が要る） | TLS 未整備。Funnel は自動発行なので出ないはず。案 C の Caddy なら `certificate obtained` が出るまで待つ／80 番が事業者ファイアウォールで塞がれていないか。 |

`curl` が通ったのにブラウザから繋がらないなら、原因は必ず ③。

#### ③ ブラウザ側のブロック

DevTools の **Console** と **Network** を必ず見る。エラー文で切り分く:

| Console / Network の見え方 | 原因 | 直し方 |
| --- | --- | --- |
| `Mixed Content: ... was loaded over HTTPS but requested an insecure ... http://` | `EXPO_PUBLIC_API_URL` が `http://` になっている（または API ホストが HTTP のみ） | 値を `https://` に。API を HTTPS で公開（§2）。 |
| `blocked by CORS policy` / `No 'Access-Control-Allow-Origin'` | backend が CORS ヘッダを返していない。※ 素の構成は `app.use(cors())` で全許可なので、これが出る＝**backend がエラーページを返している**（＝実は ② の 502/404）か、CORS を独自に絞った | まず ② を再確認。CORS を絞ったなら許可リストに Vercel ドメインを追加。 |
| `net::ERR_CERT_...` | API の証明書が無効 | ② の証明書行を参照。 |
| リクエストは `200` だが画面が動かない | API ではなく**フロントのルーティング**（SPA リライト未設定 → 直リンクで白画面）。`mobile/vercel.json` の `rewrites` が効いているか | §3.2。`vercel.json` が `mobile/` 直下にあるか、Root Directory が `mobile` か。 |
| `401` ばかり返る | トークン未保存 / 期限切れ。ログインからやり直す。web は localStorage にトークンを持つのでシークレットウィンドウで検証。 | — |

#### REST は通るが WebSocket（在席リアルタイム）だけ落ちる

症状: ログインやデータ取得は動くが、在席ドット・ナッジが即時反映されない。

1. DevTools → Network → **WS** フィルタ。
   `wss://<APIホスト>/api/v1/realtime?token=...` が **101 Switching Protocols**
   になっているか。
2. `ws://`（`s` 無し）で出ている → mixed content。`EXPO_PUBLIC_API_URL` が
   `https://` か確認（`realtime.ts` は先頭 `http`→`ws` 置換なので、`https` なら
   自動で `wss`）。
3. `101` にならず落ちる → 公開経路が Upgrade を通していない。
   Tailscale Funnel / Cloudflare Tunnel / Caddy はいずれも既定で WS 対応。
   Cloudflare 使用時はダッシュボードの Network → **WebSockets** が ON か。
4. 接続はするがすぐ切れる → backend の `authenticate` がトークンを弾いている。
   まず REST で `GET /api/v1/auth/me` が通るトークンか確認。

#### 「設定したのに直らない」チェック

- Vercel の環境変数を足した後、**Redeploy したか**（自動では反映されない）。
- 見ている URL は **Production か Preview か**。環境変数のスコープと一致しているか。
- ブラウザキャッシュ / Service Worker。ハードリロード（Cmd+Shift+R）か
  シークレットウィンドウで確認。
- 値のタイプミス: `https://` / `/api/v1` あり / 末尾スラッシュなし。
- API URL を変えたら **EAS 側**（`eas env:set --environment preview ...`）も
  更新して再ビルドしないと、ネイティブアプリは古い URL のまま。

#### 最短の自己診断（コピペ）

```bash
# 1) API は公開で生きているか（Tailscale を切った端末で）
curl -i https://<APIホスト>/api/v1/health

# 2) CORS プリフライトが通るか（Vercel のドメインを Origin に）
curl -i -X OPTIONS https://<APIホスト>/api/v1/auth/login \
  -H "Origin: https://<vercelドメイン>" \
  -H "Access-Control-Request-Method: POST"
#   → 204/200 + Access-Control-Allow-Origin ヘッダが返れば OK

# 3) 実リクエスト
curl -i -X POST https://<APIホスト>/api/v1/auth/login \
  -H "Origin: https://<vercelドメイン>" -H "content-type: application/json" \
  -d '{"email":"x@example.com","password":"wrong"}'
#   → 401 + 日本語エラー JSON が返れば、API 経路は完全に生きている
#     （あとは①のビルド埋め込みの問題）
```

### ログ / 復旧

```bash
docker compose logs -f backend
journalctl -u cloudflared -f
docker compose restart backend
systemctl restart cloudflared
```

フロントのロールバックは Vercel ダッシュボード → Deployments → 前のデプロイを
Promote。

---

## 8. コスト

| 項目 | 料金 |
| --- | --- |
| VPS（既存） | 変わらず |
| Cloudflare Tunnel + DNS | $0（無料プラン） |
| Tailscale Funnel | $0（Personal プランでも可） |
| Vercel Hobby / Cloudflare Pages | $0 |
| ドメイン | 取得する場合のみ年 $10 前後（無料サブドメインで済むなら $0） |

---

## 9. まとめ（最短ルート）

1. VPS: `OLLAMA_MODEL=gemma3:1b`、`NODE_ENV=production`、`compose.yaml` の
   `db` / `ollama` の `ports:` を削除。
2. VPS: **案 A**（Cloudflare Tunnel）で `https://api.example.com` を用意。
3. Vercel: Root Directory=`mobile` を設定（ビルド設定と SPA リライトは
   コミット済みの `mobile/vercel.json` が担う）、環境変数
   `EXPO_PUBLIC_API_URL=https://api.example.com/api/v1` を Production + Preview に追加。
4. `eas env:set --environment preview ...` でネイティブも同 API に。
5. §7 のスモークチェックを携帯回線で通す。
