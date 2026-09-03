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
- AI コメントを実際に見たい場合のみ Ollama が要る。無くてもルールベース／定型文に
  フォールバックするので機能テストは可能（[ai-development.md](./ai-development.md)）。

---

## 2. Backend を LAN に公開する

### 2‑1. DB（と、必要なら Ollama）を起動

```bash
# リポジトリ root
docker compose up -d db          # AI も見るなら: docker compose up -d
docker compose ps                # db が healthy であること
```

### 2‑2. Backend を起動（`0.0.0.0` で待ち受け）

```bash
cd backend
cp backend/.env.example backend/.env      # まだ無ければ
#   DATABASE_URL=postgresql://teamnap:teamnap_dev@localhost:5432/teamnap
#   HOST=0.0.0.0   ← 既定。LAN 公開に必須（localhost 固定にしない）
npm install
npm run db:migrate && npm run db:seed
npm run dev
```

起動ログに次が出れば OK：

```text
Team Nap API running on http://0.0.0.0:3000
Realtime WebSocket on ws://0.0.0.0:3000/api/v1/realtime
```

### 2‑3. 開発マシンの LAN IP を調べる

| OS | コマンド |
| --- | --- |
| macOS（Wi‑Fi） | `ipconfig getifaddr en0`（有線なら `en1` など） |
| Windows | `ipconfig` →「IPv4 アドレス」 |
| どれでも | `cd mobile && npx expo start` が表示する `exp://192.168.x.y:8081` の IP 部分 |

以降このガイドでは `192.168.1.23` を例に使う。

### 2‑4. 端末から到達できるか確認（ここで詰まりやすい）

**端末のブラウザ**で以下を開く：

```text
http://192.168.1.23:3000/api/v1/health
```

`{"status":"ok","service":"team-nap-api",...}` が表示されれば疎通 OK。
表示されない場合は §7 のトラブルシュートへ。

---

## 3. Mobile を実機向けに設定

`mobile/.env`：

```env
EXPO_PUBLIC_API_URL=http://192.168.1.23:3000/api/v1
```

- 実機では `http://localhost:...`（iOS シミュレータ用）や `http://10.0.2.2:...`
  （Android エミュレータ用）は**使えない**。必ず開発マシンの LAN IP。
- この 1 行で REST も WebSocket も切り替わる
  （`ws://192.168.1.23:3000/api/v1/realtime`。`https` にすれば `wss` に自動変換）。
- **`.env` は Expo 起動時にしか読まれない。** 変更したら Metro を再起動する。

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

### 6‑7. ふりかえり画面

- 仮眠タイマー → 評価 → ふりかえり：**AI アドバイス文＋猫のイラスト**が表示される。
- 画像が出ない場合は Metro を **`npx expo start -c`** で再起動（キャッシュ）。

### 6‑8. オフライン

- 端末を**機内モード** → 画面を開く → `ConnectionErrorView`（再試行ボタン）。
- 機内モード解除 → 再試行で復旧。

---

## 7. LAN が繋がらないときのトラブルシュート

| 症状 | 対処 |
| --- | --- |
| **Project is incompatible with this version of Expo Go**（QR は読めている） | 端末の Expo Go が古い。**App Store / Google Play で Expo Go を更新** → 再スキャン。更新しても直らない＝プロジェクトの SDK が公開版 Expo Go より新しい → §7‑bis の development build |
| 端末ブラウザで `.../api/v1/health` が開かない | 同一 Wi‑Fi か／VPN オフか／ルーターの client(AP) isolation を無効化。5GHz と 2.4GHz で SSID が分かれている場合は同じ帯域に揃える |
| macOS のファイアウォールがブロック | システム設定 › ネットワーク › ファイアウォール で `node` の**受信接続を許可**、または一時的にオフ |
| iOS で全く通信しない | 設定 › Expo Go › **ローカルネットワーク** を ON（初回プロンプトで拒否した場合ここで直す） |
| QR は読めるがアプリが真っ白／タイムアウト | `mobile/.env` の `EXPO_PUBLIC_API_URL` が LAN IP になっているか、変更後に **Metro を再起動**したか |
| `EXPO_PUBLIC_API_URL is not configured` | `mobile/.env` 未作成、または Metro 未再起動 |
| どうしても LAN 不可（社内 NW 等） | Metro は `npx expo start --tunnel`（`@expo/ngrok` の導入を促される）。**ただし tunnel が張るのは Metro だけ**。Backend は別途 `ngrok http 3000` か Tailscale で公開し、その URL を `EXPO_PUBLIC_API_URL=https://xxxx.ngrok.app/api/v1` に設定（WebSocket も `wss://` に自動変換） |
| 認証必須ルートで 401 ばかり | ログインしていない。`/api/v1/{teams,notifications,onboarding,settings,...}` は Bearer 必須 |
| チーム画面が空／`NAP-2001` で参加できない | `cd backend && npm run db:seed` を実行 |

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
eas device:create           # iPhone を登録（プロビジョニングプロファイルを入れる）
eas build --profile development --platform ios
```

- リポジトリに `eas.json` は無いので、初回に生成を促される（`development` プロファイル）。
- ビルド完了後のリンク／QR から `.ipa`（dev client）を端末にインストール。
- 以後は `npx expo start --dev-client` で起動し、その dev client アプリで開く。

### B. ローカルでビルド（Mac + Xcode + 有線接続）

```bash
cd mobile
npx expo run:ios --device   # 一覧から接続中の iPhone を選ぶ。Apple ID で署名
```

Android の development build は `eas build --profile development --platform android`
（`.apk`）または `npx expo run:android --device`。

> どのモデルでも Expo Go 更新だけで直ることが多い（本プロジェクトの SDK は
> `~57.0.17`、通常のリリース版）。まず §7 の「Expo Go を更新」を試す。

---

## 8. テスト間のリセット

- **サーバ側データ**：`cd backend && npm run db:seed`（冪等）。
  完全初期化は `npm run db:reset`（DROP → migrate → seed）。
- **通知フィードはサーバのインメモリ**。Backend を再起動すると
  ナッジ／仮眠提案／参加通知の結果が消える。通知を確認するテスト中は再起動しない。
- **端末側**：各端末でログアウト。アイコン／アセットが古いときは `npx expo start -c`。

---

## 9. いまの制約（実機でも変わらない）

- **プッシュ通知なし**：通知はアプリを開いている間だけ表示される（バックグラウンド配信なし）。
- **Google ログインなし**：「Google で〜」系ボタンは未対応。
- **チームのサマリー／ランキングは固定ダミー**（実データではない）。
- AI コメント：Ollama 未起動でも 200 を返す（ルールベース／定型文にフォールバック）。
  実 AI 文を見るには Ollama ＋ 対応モデルが必要（[ai-development.md](./ai-development.md)）。
