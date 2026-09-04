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

### 案 C VPS に直接つなぐ（Caddy + 443 開放）

トンネルを使わず、**VPS の IP に直接** ドメインを向けて 80/443 を開ける。
Caddy が Let's Encrypt 証明書を自動取得・更新し、`:3000` にプロキシする
（WebSocket も自動）。リポジトリに設定一式を用意済み → [`deploy/`](../deploy/)。

**必要なもの**: `API_DOMAIN`（例 `api.example.com`）の A レコードを VPS の
公開 IP に向ける。**ドメインを持っていないなら `<VPS_IP>.sslip.io`**
（例 `203.0.113.10.sslip.io`）を使えば DNS 設定は不要 — そのまま IP に解決され、
Caddy がその名前で証明書を取る。

#### C-1. ホスト名を用意して確認

```bash
# 別マシンから。VPS の公開 IP が返ればOK（sslip.io なら設定不要で必ず返る）
dig +short api.example.com
```

#### C-2. ファイアウォールを 22 / 80 / 443 だけに

VPS 側:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp        # ACME HTTP-01 チャレンジに必須
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

クラウド事業者側の Security Group / ネットワーク ACL でも 22/80/443 を許可
（80/443 が事業者ファイアウォールで閉じていると証明書取得に失敗する）。

#### C-3. 本番 env を置く（リポジトリ root）

```bash
cd <repo>            # compose.yaml のある場所
cp deploy/.env.prod.example .env
$EDITOR .env         # API_DOMAIN を実際の値に。OLLAMA_MODEL=gemma3:1b。DB パスワードも
```

#### C-4. 起動

```bash
docker compose -f compose.yaml -f deploy/compose.prod.yaml up -d --build
docker compose -f compose.yaml -f deploy/compose.prod.yaml logs -f caddy
```

`certificate obtained successfully` が出れば TLS 準備完了（初回は数十秒）。
`deploy/compose.prod.yaml` は Postgres `5432` / Ollama `11434` / backend の
生 `3000` の publish を止め、`NODE_ENV=production` を強制する。
`ports: !reset []` は Docker Compose v2.24.0+ 必須（古い場合は
[`deploy/README.md`](../deploy/README.md) の手動手順）。

#### C-5. 確認

```bash
# VPS の外から。-k なしで通ること（＝証明書が有効）
curl https://api.example.com/api/v1/health
# → {"status":"ok","service":"team-nap-api",...}
```

通れば **これが `<public-api-host>`**。Vercel の
`EXPO_PUBLIC_API_URL = https://api.example.com/api/v1`。

#### C-6. 「直接公開して安全か」

短期のハッカソン審査なら **概ね可**。ただし前提:

- ファイアウォールが 22/80/443 のみ（C-2）。
- Postgres / Ollama を publish しない（C-4 の overlay が実施）。
- `NODE_ENV=production`（`/auth/debug` 等を無効化）。
- DB パスワードを compose 既定 `teamnap_dev` から変更。
- **審査後に落とす**: `docker compose ... down` ＋ `ufw deny 80,443`。

残るリスク（許容範囲だが把握しておく）:

- `/auth/signup` は誰でも叩ける（アカウント作り放題）。
- `/auth/login` にレート制限がまだ無い（総当たり耐性なし）。
  → 気になるなら `express-rate-limit` を `/auth/*` に（コード変更・別 PR）、
  または Caddy 側で `rate_limit`。
- CORS は現状全許可。デモでは動くが、後で Vercel オリジンに絞るのが望ましい。

IP を隠したい / DDoS 対策が欲しいが**トンネルは使いたくない**場合は、
ドメインを Cloudflare の DNS に載せて対象レコードを **プロキシ（オレンジ雲）**
にするだけでよい（Caddy は VPS 上のまま、`cloudflared` は不要）。その場合
Caddy の証明書は DNS-01 か、Cloudflare の「Full (strict)」+ Origin 証明書に。

> **補足**: フロントも VPS の Caddy で配信すれば Vercel すら不要（1 オリジン・
> CORS 不要）。ただし Vercel の CDN / push デプロイ / プレビュー URL は失う。

---

## 3. フロントを Vercel に出す

Expo Web は **静的 SPA**（`app.json` に `web.output` 指定なし = `single`）。
Vercel は静的配信するだけ。

### 3.1 プロジェクト設定（Vercel ダッシュボード）

| 項目 | 値 |
| --- | --- |
| Root Directory | `mobile` （モノレポ。npm workspaces ではないので必須） |
| Framework Preset | Other |
| Build Command | `npx expo export -p web` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 20 以上 |

### 3.2 SPA フォールバック

直リンク（`/home` など）で 404 にならないよう `mobile/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

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

1. VPS で API を HTTPS 公開する（いずれか）:
   - **VPS に直接**（案 C）: A レコード or `<IP>.sslip.io` → `ufw` で 22/80/443
     → `cp deploy/.env.prod.example .env` で `API_DOMAIN` 設定 →
     `docker compose -f compose.yaml -f deploy/compose.prod.yaml up -d --build`。
   - トンネル: **案 A**（Cloudflare Tunnel）or **案 B**（Tailscale Funnel）。
2. `curl https://<API_DOMAIN>/api/v1/health` が VPS の外から通ることを確認。
3. Vercel: Root Directory=`mobile`（ビルド設定と SPA リライトは
   `mobile/vercel.json`）、環境変数 `EXPO_PUBLIC_API_URL=https://<API_DOMAIN>/api/v1`。
4. `eas env:set --environment preview ...` でネイティブも同 API に。
5. §7 のスモークチェックを携帯回線で通す。審査後に落とす。
