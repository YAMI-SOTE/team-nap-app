# 実機テストガイド（iPhone / Android・複数アカウント）

シミュレータ／エミュレータではなく、**物理端末**で、しかも**複数アカウント／複数端末**で
Team Nap を動かすための手順。チーム機能（ライブ在席・ナッジ・仮眠提案）と
スワイプ操作は実機・複数端末でないと確認できない。

- 機能単位の手動確認手順は [testing-guide.md](./testing-guide.md)
- テストアカウント一覧は [test-account.md](./test-account.md)
- 一般的なセットアップ／トラブルシュートは [setup.md](./setup.md)

---

## 0. 実機でしか確認できないこと

| 項目 | なぜ実機・複数端末が要るか |
| --- | --- |
| 横スワイプでのタブ移動 | エッジスワイプの誤動作（登録画面に戻る等）は実機ジェスチャでしか出ない |
| チームのライブ在席（WebSocket） | 端末 A の操作が端末 B に即時反映されることを見る |
| ナッジ（休んでね／起きて〜）・チーム仮眠提案 | 送信側と受信側で別アカウントが要る |
| セーフエリア・スプラッシュ・スクロール境界 | ノッチ／ホームインジケータ実機依存 |
| 実ネットワーク（LAN 断・機内モード） | `ConnectionErrorView` / `ApiError(0)` の挙動 |
| ふりかえり画面の画像表示 | Metro キャッシュ問題の再現・切り分け |
| 休息後の AI アドバイス（ふりかえり画面） | Ollama を上げれば LLM 生成文、無ければルールベース。どちらも表示される（§2 の起動モード次第）|

---

## 1. 前提

- 開発マシン（Mac / PC）と**すべての端末が同じ Wi‑Fi** に接続。
  ゲスト Wi‑Fi / 社内 Wi‑Fi の *client isolation（AP isolation）* があると繋がらない。
- 開発マシン・端末とも **VPN はオフ**。
- 各端末に **Expo Go** をインストール（iOS: App Store / Android: Google Play）し、
  **必ず最新へアップデート**する。本プロジェクトは Expo **SDK 57**。古い Expo Go だと
  「Project is incompatible with this version of Expo Go」で起動できない（→ §7 / §7‑bis）。
- カスタムネイティブモジュールは無いので、Expo Go さえ新しければ **全機能動く**。
  それでも合わない場合だけ development build（§7‑bis）。

---

## 2. Backend を LAN に公開する

### 2‑0. AI 機能はテストできるか

| AI 機能 | 状態 | 実機での確認場所 |
| --- | --- | --- |
| 休息後のアドバイス | **統合済み**。`naps.service` → Ollama（`generateNapAdvice`）→ 失敗時ルールベース（`buildAdvice`） | 仮眠タイマー → 評価 → **ふりかえり画面**の「AIアドバイス」カード |
| HOME の見出し／aiAdvice（チーム加入時） | **統合済み**。Ollama → 失敗時 定型文 | チームに入った状態でホーム上部 |
| 休息提案（`/rest/decision`） | ルールエンジン（LLM ではない） | ホームの「そろそろ休息がおすすめです」カード |
| 個人／チーム RESTコメント（`/ai/*-comment`） | 実装済みだが **通常 UI からは呼ばれない**（`(dev)/ai-test` 画面専用） | Expo Router で `/ai-test` を開く |

**Ollama が無くても全部動く**（ルールベース／定型文にフォールバック）。
**LLM が実際に生成した日本語**を見たいときだけ Ollama ＋ モデルが要る。
どのモードで起動するかを次で選ぶ。

### 2‑1. 起動モードを選ぶ

| | モード A：ローカル Backend | モード B：フル `docker compose`（root） |
| --- | --- | --- |
| コマンド | `docker compose up -d db` ＋ `cd backend && npm run dev` | リポジトリ root で `docker compose up -d --build` |
| Ollama | 含まれない（AI は常にフォールバック） | `ollama` ＋ `ollama-pull` も起動し、`OLLAMA_MODEL` を pull → **LLM 生成文が出る** |
| 反復の速さ | 速い（ホットリロード） | やや遅い（初回はモデル pull。既定 `gemma4:e2b` は ~7.2GB／~8GB RAM 必要。RAM が少なければ `OLLAMA_MODEL=gemma3:1b`＝~815MB） |
| seed | `npm run db:seed` を自分で実行 | `docker compose exec backend npm run db:seed` を自分で実行（自動では走らない） |

> 迷ったら **モード A**。チーム機能・スワイプ・ふりかえり画面の導線はすべて
> モード A で確認できる（AI 文はルールベースになる）。**AI の生成文そのもの**を
> レビューするときだけモード B。

### 2‑1.5. 接続の全体像（ここでよく詰まる）

**モード B（root から `docker compose up`）でも、端末が繋ぐ先は 2 つある**。
両方が **同じ開発マシンの LAN IP** で届く必要がある。

```text
iPhone / Android
   │
   ├─ exp://<開発マシンの LAN IP>:8081   … Metro（JS を配信）
   │      ↑ `cd mobile && npx expo start` で起動。docker compose では立たない
   │
   └─ http://<開発マシンの LAN IP>:3000/api/v1   … Backend API
          ↑ モード B ではこれが docker のコンテナ（`3000:3000` を公開）
```

- **`docker compose up` は Backend だけ**。Mobile アプリは別プロセス
  （`cd mobile && npx expo start`）。root で compose しても Metro は起動しない。
- **アプリの画面は出るのに `boot notification failed: サーバーに接続できません`**
  → Metro は届いている＝`8081` は OK。**`3000`（API）に届いていない**。
  原因はほぼ次のどれか：
  1. `mobile/.env` の IP が古い（Wi‑Fi / テザリングで再割り当てされた）→ §2‑3
  2. `mobile/.env` を書き換えた後 **Metro を再起動していない**（`.env` は起動時のみ）→ §3
  3. macOS のファイアウォールが受信をブロック → §7
  4. 端末が Wi‑Fi ではなくモバイル回線、または Mac と別ネットワーク → §7

### 2‑2A. モード A（ローカル Backend）

```bash
# リポジトリ root
docker compose up -d db
docker compose ps                          # db が healthy

cd backend
cp backend/.env.example backend/.env       # まだ無ければ
#   DATABASE_URL=...@localhost:5432/teamnap
#   HOST=0.0.0.0   ← 既定。LAN 公開に必須（localhost 固定にしない）
npm install
npm run db:migrate && npm run db:seed
npm run dev
```

起動ログ：

```text
Team Nap API running on http://0.0.0.0:3000
Realtime WebSocket on ws://0.0.0.0:3000/api/v1/realtime
```

### 2‑2B. モード B（フル compose、root から）

```bash
# リポジトリ root
docker compose up -d --build               # backend / db / ollama / ollama-pull

# モデル pull の完了を待つ（初回は数分〜）
docker compose logs -f ollama-pull         # "success" が出たら Ctrl-C
docker compose exec ollama ollama list     # モデルが並ぶこと

# シードは自動では走らない
docker compose exec backend npm run db:seed
```

- `backend` コンテナは `db` が healthy になれば起動する（`ollama-pull` は待たない）。
  pull が終わるまで AI はフォールバック、終われば LLM 生成に切り替わる。
- 既定モデルは `gemma4:e2b`（日本語が最も自然。ollama サービスに ~8GB RAM / 2CPU
  必要、生成はウォーム ~24 秒）。RAM が足りないホストでは
  `OLLAMA_MODEL=gemma3:1b docker compose up -d`（~815MB, 4GB/1CPU。詳細は
  [ai-development.md](./ai-development.md)）。
- `backend/.env` はモード B では使われない（compose が環境変数を直接渡す）。

### 2‑3. 開発マシンの LAN IP を調べる（毎回。IP は変わる）

Wi‑Fi / テザリングの IP は **接続のたびに変わりうる**。テスト開始時に必ず取り直し、
`mobile/.env` に反映する。

```bash
# macOS（Wi‑Fi）
ipconfig getifaddr en0                 # 例: 10.232.120.14
# Windows
ipconfig                               # 「IPv4 アドレス」
```

`npx expo start` を起動済みなら、ターミナルの
`Metro waiting on exp://10.232.120.14:8081` の IP 部分がそれ。**この IP と
Backend の IP は同じでなければならない。**

以降このガイドでは `10.232.120.14` を例に使う（あなたの値に読み替える）。

> IP が頻繁に変わる／社内ネットワークで届かない場合は §7 の
> **Tailscale / tunnel** を使うと固定できる。

### 2‑4. 端末から到達できるか確認（ここで詰まりやすい）

`mobile/.env` を直す前に、**端末のブラウザ**で叩いて切り分ける：

```text
http://10.232.120.14:3000/api/v1/health
```

- `{"status":"ok","service":"team-nap-api",...}` が出る → 疎通 OK。あとは §3。
- **タイムアウト／接続できない** → §7（ファイアウォール／別ネットワーク／IP 違い）。
  `mobile/.env` をいくら直しても、このブラウザテストが通らないうちは繋がらない。

---

## 3. Mobile を実機向けに設定

1. **`mobile/.env` を §2‑3 で取った IP に書き換える**（`.gitignore` 済みのローカルファイル）：

   ```env
   EXPO_PUBLIC_API_URL=http://10.232.120.14:3000/api/v1
   ```

   - 実機では `http://localhost:...`（iOS シミュレータ用）や `http://10.0.2.2:...`
     （Android エミュレータ用）は**使えない**。必ず開発マシンの LAN IP。
   - この 1 行で REST も WebSocket も切り替わる
     （`ws://…:3000/api/v1/realtime`。`https` にすれば `wss` に自動変換）。

2. **Metro を完全に再起動する**（`.env` は Expo 起動時にしか読まれない）：

   ```bash
   # 動いている npx expo start を Ctrl-C で止めてから
   cd mobile && npx expo start -c
   ```

   アプリ内リロード（`r` や端末を振る）だけでは `.env` は読み直されない。

3. 端末で Expo Go を開き直す（§4）。まだ古い挙動なら、Expo Go の
   最近使ったプロジェクト履歴から開かず、**新しい QR を撮り直す**。

---

## 4. Metro を起動して端末で開く

```bash
cd mobile
npm install
npx expo start                # 既定は LAN モード（QR が出る）
# アセットを更新した直後は:
npx expo start -c             # Metro キャッシュをクリア
```

ターミナル／ブラウザに QR コードが表示される。

### iPhone

1. **「カメラ」** アプリで QR を撮る → 出てくる「Expo Go で開く」バナーをタップ。
2. 初回、**「ローカルネットワーク上のデバイスの検出」許可**を求められたら **許可**。
   （あとから変更：**設定 › Expo Go › ローカルネットワーク** を ON）
3. iOS 15.1 以上が必要。

### Android

1. **Expo Go** アプリを開く → **「Scan QR code」** → QR を撮る。
2. LAN IP への `http://`（平文）通信は Expo Go では許可済み（追加設定不要）。
3. 切断が多い場合：**Private DNS を「自動」または「オフ」**、
   **電池最適化の対象から Expo Go を外す**。

---

## 5. 複数アカウントの回し方

### 端末とアカウントは 1 : 1

セッションは端末の `expo-secure-store` に **1 つだけ**保持される。
1 端末 = 1 ログイン。

- **同時に複数アカウントを動かす** → 端末を分ける。
  例）iPhone = 太郎、Android = 花子、（3 人目が要れば）`w` で開く Web = 三郎。
- **1 端末で順番に切り替える** → ログアウト（**設定タブ下部**、または
  **設定 › アカウント情報** の下部。どちらも二段階確認）→ 別アカウントでログイン。

### シード済みアカウント（`npm run db:seed` で投入。冪等）

| メール | パスワード | 位置づけ |
| --- | --- | --- |
| **サンプルチーム**（招待コード `NAP-2001`） | `samplepass123` | チーム機能テスト用。全員オンボーディング済み |
| `sample@teamnap.app` | 〃 | **owner**（サンプル 太郎）。仮眠履歴＋当週スケジュール（Google 連携済み）あり |
| `hanako@teamnap.app` | 〃 | member（サンプル 花子） |
| `jiro@teamnap.app` | 〃 | member（サンプル 次郎）。**「起こしてもらう」OFF** → wake ナッジは 409 |
| `saburo@teamnap.app` | 〃 | member（サンプル 三郎） |
| `dev@teamnap.local` ほか `*@teamnap.local` 6 名 | `teamnap-dev` | 開発チーム `NAP-4821`。`dev@` 以外はオンボーディング未完了（初回導線の確認用） |

詳細・各メンバーの在席状態は [test-account.md](./test-account.md)。

### 新規アカウントで試す

1. サインアップ → オンボーディング（**アイコン選択**を含む）→ ホーム。
2. チームに入るには、既存メンバーが **設定 › チーム設定 › 招待リンクを共有** で出す
   コード／`teamnap://team/join?code=…` を使って参加画面から join。

---

## 6. 複数端末でやるテストシナリオ

前提：iPhone = **太郎**、Android = **花子**（同じサンプルチーム）でログイン済み。

### 6‑1. 在席のライブ更新（WebSocket）

1. Android（花子）で **「仮眠する」→ タイマー画面**を開く。
2. iPhone（太郎）の **ホーム／チーム**のメンバー表示が、**その場で**「仮眠中」に変わる。
3. Android でタイマー画面を閉じる → iPhone 側が「作業中」に戻る。

### 6‑2. ナッジ（休んでね／起きて〜）

1. iPhone（太郎）→ チームタブ → 花子をタップ → メンバー詳細。
2. **「休んでね」** → Android（花子）の**通知タブ**先頭に `rest_request`。
3. 次郎（起こしてもらう OFF）に **「起きて〜」** → **409 →「相手が『起こしてもらう』をOFFにしています」**。

### 6‑3. チーム仮眠提案

1. iPhone（太郎）→ ホーム **「みんなを誘う」** または チーム **「◯分仮眠を提案」**。
2. Android（花子）／3 台目（三郎）の**通知タブ**に `team_nap_suggestion`
   （提案者本人には積まれない）。

### 6‑4. メンバー管理（オーナーのみ）

1. iPhone（太郎＝owner）→ 設定 › チーム設定 › **メンバーを管理** → 三郎を削除。
2. 三郎でログイン中の端末は WebSocket が切れ、チーム未参加の表示に変わる。

### 6‑5. アイコンの反映

1. Android（花子）→ 設定 › アカウント情報 で**アイコンを選択 → 保存**。
2. iPhone（太郎）の メンバー一覧／ランキング／メンバー詳細に反映（次回読み込み時）。
   アイコン未選択のメンバーは ID から決まる既定アイコンになる。

### 6‑6. スワイプ操作（実機必須）

- タブ画面で**左右スワイプ → 隣のタブへ**（ホーム↔スケジュール↔チーム↔統計↔設定）。
- スワイプで**登録画面に戻らないこと**を確認。
- スケジュール画面は**「予定」リストだけが縦スクロール**し、画面全体はスクロールしない。
- ホーム／統計は縦スクロールしない。

### 6‑7. ふりかえり画面（休息後の AI アドバイス）

1. ホーム／スケジュールから **仮眠する** → タイマー（15 分。動作確認は「終了」で短縮可）
2. 評価画面で 目覚め／集中度 を入力 → 保存（`POST /naps`）
3. **ふりかえり画面**：「AIアドバイス」カード＋猫のイラスト
   - **モード A（Ollama なし）** → `nap-advice.service.ts` のルールベース文
     （「適切な長さで、深く眠りすぎずに…」など、決まった組み合わせ）
   - **モード B（Ollama あり・pull 済み）** → LLM 生成文（毎回少し違う自然な日本語）。
     生成に時間がかかる（既定 `gemma4:e2b` はウォーム ~24s。`OLLAMA_TIMEOUT_MS`、既定 60s）。超えたら A と同じ文に落ちる
   - 履歴（統計 →「すべて見る」）の各行からも同じ画面を開き直せる（保存済みの文）
- 猫の画像が出ない場合は Metro を **`npx expo start -c`** で再起動（キャッシュ）。

### 6‑8. オフライン

- 端末を**機内モード** → 画面を開く → `ConnectionErrorView`（再試行ボタン）。
- 機内モード解除 → 再試行で復旧。

---

## 7. LAN が繋がらないときのトラブルシュート

| 症状 | 対処 |
| --- | --- |
| **Project is incompatible with this version of Expo Go**（QR は読めている） | 端末の Expo Go が古い。**App Store / Google Play で Expo Go を更新** → 再スキャン。更新しても直らない＝プロジェクトの SDK が公開版 Expo Go より新しい → §7‑bis の development build |
| **アプリの画面は出るが `boot notification failed: サーバーに接続できません`** | Metro（`8081`）は届いている。届いていないのは API（`3000`）。↓ の行を順にチェック |
| ↳ `mobile/.env` の IP が古い | Wi‑Fi / テザリングで IP が変わった。`ipconfig getifaddr en0` で取り直し、`mobile/.env` を更新（§2‑3）。**端末ブラウザで `http://<新IP>:3000/api/v1/health` が 200 を返すことをまず確認**（§2‑4） |
| ↳ `.env` を直したのに変わらない | Metro を **完全再起動**していない。`npx expo start` を Ctrl‑C → `npx expo start -c`。`r` や振り直しでは `.env` は読み直されない |
| ↳ 端末ブラウザでも `.../health` が開かない | ①端末が Wi‑Fi ではなくモバイル回線／②Mac と別 SSID・別ネットワーク／③ルーターの client(AP) isolation／④VPN。Mac と端末が同じ LAN にいることを最優先で確認 |
| macOS のファイアウォールがブロック | システム設定 › ネットワーク › ファイアウォール で `node` と **Docker（`com.docker.backend`）の受信接続を許可**、または一時的にオフ。`docker compose` の公開ポートでも受信は macOS FW を通る |
| iOS で全く通信しない | 設定 › Expo Go › **ローカルネットワーク** を ON（初回プロンプトで拒否した場合ここで直す） |
| `EXPO_PUBLIC_API_URL is not configured` | `mobile/.env` 未作成、または Metro 未再起動 |
| **IP が頻繁に変わる／社内・キャリア NW で LAN が届かない** | **Tailscale**（推奨）：Mac と端末の両方に Tailscale を入れ、`tailscale ip -4` の `100.x` を使う → `EXPO_PUBLIC_API_URL=http://100.x.x.x:3000/api/v1`、Metro も `exp://100.x.x.x:8081` で届く。ネットワークが変わっても固定。<br>または **tunnel**：Metro は `npx expo start --tunnel`（`@expo/ngrok` 導入を促される）。tunnel が張るのは Metro だけなので Backend は別途 `ngrok http 3000` し、その `https://xxxx.ngrok.app/api/v1` を `EXPO_PUBLIC_API_URL` に（`wss://` に自動変換） |
| 認証必須ルートで 401 ばかり | ログインしていない。`/api/v1/{teams,notifications,onboarding,settings,...}` は Bearer 必須 |
| チーム画面が空／`NAP-2001` で参加できない | seed 未実行。モード A: `cd backend && npm run db:seed`／モード B: `docker compose exec backend npm run db:seed` |
| ふりかえりの AI 文がいつもルールベース（モード B のはず） | `docker compose exec ollama ollama list` にモデルが無い＝pull 未完了／失敗。`docker compose logs ollama-pull` を確認。`docker compose logs ollama` に `llama-server ... signal: killed` があれば RAM 不足＝`OLLAMA_MODEL=gemma3:1b` に切替 |

---

## 7‑bis. Expo Go が使えないとき（Development Build）

Expo Go を最新にしても「incompatible」が消えない場合は、プロジェクトの Expo SDK が
公開版 Expo Go より新しい。その場合は **development build**（SDK を同梱したカスタム
クライアント）を作る。Expo Go の制約を受けない。

### 確認（どちらのケースか切り分け）

- 端末の Expo Go を開く → バージョン表示。<https://expo.dev/go> が Expo Go の
  バージョン ↔ 対応 SDK の対応表。更新済み Expo Go でも SDK 57 非対応なら
  development build が必要。
- **iOS シミュレータ**は Expo が SDK 一致の Expo Go を自動で入れるため常に動く。
  実機の Expo Go だけがストア版に固定される。

### A. EAS でビルド（Mac の Xcode 不要）

```bash
cd mobile
npm i -g eas-cli            # or: npx eas-cli@latest ...
eas login                   # Expo アカウントが要る
# eas init は不要（app.json に extra.eas.projectId をコミット済み）
eas device:create           # iOS のみ。iPhone を登録（プロビジョニングプロファイル）
eas build --profile development --platform ios      # iOS
eas build --profile development --platform android  # Android（.apk / dev client）
```

- `eas.json` はリポジトリに含まれている（`development` / `preview` / `production`）。
- ビルド完了後のリンク／QR から dev client（iOS `.ipa` / Android `.apk`）を端末へ。
- 以後は `npx expo start --dev-client` で起動し、その dev client アプリで開く。
  → **Metro（＝Mac）が必要。**

### B. ローカルでビルド（Mac + Xcode / Android SDK + 有線接続）

```bash
cd mobile
npx expo run:ios --device       # 一覧から接続中の iPhone を選ぶ。Apple ID で署名
npx expo run:android --device   # 接続中の Android 端末へ
```

> どのモデルでも Expo Go 更新だけで直ることが多い（本プロジェクトの SDK は
> `~57.0.19`、通常のリリース版）。まず §7 の「Expo Go を更新」を試す。

---

## 7‑ter. スタンドアロン配布（EAS preview ビルド）

Metro も Expo Go も Mac も **要らない**。端末に普通のアプリとして入り、以後は
サーバーへ直接つなぐだけ。デモや、開発機を持ち歩けないときに向く。

```text
iPhone / Android の Team Nap アプリ
        │  HTTPS
        ▼
   公開された Backend（例: https://<host>/api/v1）
        ▼
   PostgreSQL
```

### 前提

- **公開 HTTPS で到達できる Backend が要る。** `localhost` や LAN IP、
  Tailscale の URL（端末側にも Tailscale が要る）では、配布後にネット環境が
  変わると繋がらなくなる。preview ビルドはネットワーク到達性を変えない。
- `app.json` の `ios.bundleIdentifier` / `android.package` は設定済み
  （`app.teamnap.mobile`）。配布を始めたら変更しない。
- Expo アカウント。iOS は Apple Developer の署名アクセス（内部配布は ad-hoc
  プロビジョニング）。Android は不要。

### 手順

```bash
cd mobile
npm install
npx expo-doctor                 # 問題があれば先に解消
npm i -g eas-cli
eas login
# eas init は不要（extra.eas.projectId は app.json にコミット済み）

# 配布ビルドが指す API URL を EAS 側に登録（.env ではなく EAS の環境変数）
eas env:set --environment preview \
  --name EXPO_PUBLIC_API_URL --value https://<公開APIホスト>/api/v1
eas env:list --environment preview        # 確認

# iOS のみ: 端末を登録（Website を選び、URL を iPhone で開く）
eas device:create
eas device:list

# ビルド
eas build --profile preview --platform android   # → 直接入る .apk
eas build --profile preview --platform ios       # → 登録済み iPhone に入る .ipa
eas build --profile preview --platform all        # 両方
```

- `eas.json` の `preview` プロファイルは `distribution: "internal"`、Android は
  `buildType: "apk"`（AAB ではなく、そのまま入れられる APK）。`autoIncrement` で
  ビルド番号は EAS が管理する（`cli.appVersionSource: "remote"`）。
- ビルド完了ページの QR / リンクを **端末側で** 開いてインストール。
  - Android: 「提供元不明のアプリ」を一度許可。
  - iOS 16+: 設定 → プライバシーとセキュリティ → デベロッパモード を ON。
- インストール後は `npx expo start` 不要。アプリはホーム画面に常駐し、
  `EXPO_PUBLIC_API_URL` のサーバーへ直接つなぐ。

### `EXPO_PUBLIC_API_URL` に何を入れるか

Backend のルートは `/api/v1` プレフィックス（`docs/backend.md`）。リバース
プロキシで `https://<host>` → `:3000` に流しているなら
`https://<host>/api/v1`。WebSocket 在席は `http`→`ws` 置換で自動導出されるので
別途設定は不要（`wss://<host>/api/v1/realtime`）。プロキシ設定は
`docs/setup.md` の「本番デプロイ（VPS）」。

---

## 7‑quater. リンクで配る（ハッカソン審査 / デモ）

「審査員がリンクを開くだけ」を優先度順に。**どの方法でも Backend は公開
HTTPS が前提**（Tailscale URL は審査員側にも Tailscale が要るので不可。
`docs/setup.md`「本番デプロイ（VPS）」）。

| 方法 | 審査員の操作 | 対応 OS | 費用 / 前提 |
| --- | --- | --- | --- |
| **① Web デプロイ** | ブラウザで URL を開くだけ | すべて（PC / iPhone / Android） | 無料。Expo アカウント |
| **② Appetize.io** | ブラウザ内でエミュレータ操作（インストール不要） | すべて（画面内で iOS / Android を動かす） | 無料枠（月 ~100 分）。ビルド成果物が要る |
| **③ Android APK リンク** | リンク → APK を入れる（提供元不明を一度許可） | Android のみ | 無料。EAS ビルド |
| **④ TestFlight** | TestFlight を入れ、公開リンクから参加 | iOS のみ | Apple Developer（$99/年）＋初回 Apple 審査（数時間〜1 日） |

### ① Web デプロイ ← まずこれ

アプリは web で動く（レスポンシブ対応済み）。静的サイトとして出すだけ。

```bash
cd mobile
# API URL を埋め込んでエクスポート
EXPO_PUBLIC_API_URL=https://<公開APIホスト>/api/v1 npx expo export -p web
# dist/ を配信（いずれか）
npx eas deploy                    # EAS Hosting → https://team-nap--xxxx.expo.app
#   or: Vercel / Netlify / Cloudflare Pages に dist/ を上げる
```

- 審査員はどの端末でも URL を開くだけ。インストール不要。
- web ではプッシュ通知は動かない（フィードは動く）。それ以外の主要導線は動く。

### ② Appetize.io（ブラウザ内エミュレータ）

ネイティブアプリを **審査員のブラウザ内**で動かす。インストールも端末登録も不要。
iOS も対象（Appetize がクラウドで iOS シミュレータを動かす。Apple Developer 不要）。

```bash
cd mobile
eas build --profile preview --platform android    # → .apk
eas build --profile "preview:sim" --platform ios  # → iOS シミュレータ用（.tar.gz）
```

`preview:sim` は `eas.json` にある（`preview` を継承して `ios.simulator: true`）。
できた成果物を <https://appetize.io> にアップロードすると、共有 URL または
埋め込みが得られる。無料枠の分数に注意（審査時間中の同時利用が多いと尽きる）。

### ③ Android APK リンク

`eas build --profile preview --platform android` の完了ページ（`https://expo.dev/...`）
の QR / リンクを審査員に渡す。Android 端末ならリンクから直接インストールできる
（「提供元不明のアプリ」を一度許可）。**iOS の internal ビルドはリンクだけでは
入らない**（`eas device:create` で登録済みの端末のみ）。

### ④ TestFlight（iOS で本当にリンク配布したい場合）

```bash
eas build --profile production --platform ios
eas submit --platform ios
```

App Store Connect で TestFlight の「公開リンク」を有効化 → そのリンクを配る。
最大 10,000 人の外部テスターが参加可能。Apple Developer 登録と初回ビルドの
Apple 審査が要るので、締め切りに対して前倒しで。

---

## 8. テスト間のリセット

- **サーバ側データ**（冪等）：
  - モード A → `cd backend && npm run db:seed`（完全初期化は `npm run db:reset`）
  - モード B → `docker compose exec backend npm run db:seed`
- 通知フィード・仮眠記録・スケジュール・チーム・設定はすべて Postgres 永続化。
  Backend を再起動しても消えない（`npm run db:reset` で初期化）。
- **端末側**：各端末でログアウト。アイコン／アセットが古いときは `npx expo start -c`。

---

## 9. いまの制約（実機でも変わらない）

- **プッシュ通知**：実装済みだが、実機配信には EAS ビルド（§7‑bis / §7‑ter）が
  要る（Expo Go は SDK 53+ でプッシュ受信不可）。preview ビルドでも受け取れる。
  フィード自体は常に動く。[notifications.md](./notifications.md)。
- **Google ログインなし**：「Google で〜」系ボタンは未対応。
- **AI**：統合済みで実機テスト可能。ただし
  - 休息後アドバイス と HOME コメントは製品 UI に出る。個人／チーム RESTコメント
    （`/ai/*-comment`）は `/ai-test` 画面からしか呼ばれない。
  - Ollama 未起動（モード A）でも 200 を返す（ルールベース／定型文）。実 LLM 文は
    モード B（フル compose ＋ モデル pull）で。詳細は
    [ai-development.md](./ai-development.md)。
