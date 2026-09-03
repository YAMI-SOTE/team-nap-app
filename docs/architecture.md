# アーキテクチャ概要

Team Nap 全体の構成。ドキュメント索引は [README.md](./README.md)、個別の設計は
末尾の「詳細ドキュメント」。

---

## 1. システム構成

```text
┌─────────────┐        HTTPS / WSS         ┌──────────────────────────┐
│   Mobile    │  ───────────────────────▶  │        Backend           │
│ Expo (RN)   │   /api/v1/*  (Bearer)      │  Express 5 + TypeScript   │
│ expo-router │  ◀───────────────────────  │  (ESM / NodeNext)         │
└─────────────┘   /api/v1/realtime (WS)    └───────────┬──────────────┘
                                                       │
                              ┌────────────────────────┴─────────────┐
                              ▼                                      ▼
                     ┌────────────────┐               ┌──────────────────┐
                     │  PostgreSQL 17 │               │  Ollama (Gemma)  │
                     │  via Prisma 7  │               │  AI コメント生成  │
                     │  + adapter-pg  │               │  OLLAMA_URL      │
                     └────────────────┘               └──────────────────┘
```

- **Mobile は DB / Ollama に直接触れない**。すべて Backend API 経由。
- Backend は 1 プロセスで HTTP と WebSocket の両方を待ち受ける（`src/server.ts`）。
- Docker Compose では `backend` / `db` / `ollama` / `ollama-pull`（モデル取得の
  ワンショット）の 4 サービス（`compose.yaml`）。
- AI（Ollama）は best-effort。落ちている / 遅い / 壊れた出力なら全経路が
  ルールベース・定型文へフォールバックし、API 自体は止まらない。

---

## 2. リポジトリ構成

```text
team-nap-app/
├── backend/     Express + Prisma API（このルートに tsconfig / package.json）
├── mobile/      Expo (React Native) アプリ
├── llm/         プロンプト資料（llm.md, prompts/*.txt）※実行は Ollama
├── docs/        設計・手順ドキュメント（本ファイル含む）
├── compose.yaml Docker Compose（backend / db / ollama / ollama-pull）
└── README.md    セットアップの入口
```

> モノレポだが npm ワークスペースではない。依存は `backend/` と `mobile/` で
> **別々に** `npm install` する。ルートに `package.json` は無い。

---

## 3. Backend レイヤリング

```text
HTTP Route  (src/routes/*.ts)
   │  validate({ body / params / query })  … zod（src/schemas/*.ts）
   ▼
Controller  (src/controllers/*.ts)         … 薄い。requireUserId で認証ユーザー取得
   ▼
Service     (src/services/*.ts)            … ドメインロジック
   ▼
Prisma (src/lib/prisma.ts)  /  Ollama (src/services/ai.service.ts)
```

- `src/routes/index.ts` が `/health` と `/auth` 以外の全ルートに
  `authenticate` を一括適用（`/api/v1` プレフィックス配下）。
- `process.env` を読むのは `src/config/env.ts` のみ（zod で検証、不正なら起動失敗）。
- エラーは `HttpError` → `errorHandler` が `{ error, details }` に整形。
  **ユーザー向けメッセージは日本語**。
- リアルタイム在席は `src/realtime/hub.ts`（`ws`）。`broadcastTeamMembers(teamId)`。

## 4. Mobile 構成

```text
src/
├── app/         expo-router のルート。薄いラッパで features/ を呼ぶ
├── features/    画面本体（<name>/<Name>Screen.tsx）
├── components/  再利用 UI（+ components/ui/）
├── services/    API 呼び出し（api.ts + <feature>.ts）
├── hooks/       画面ロジック（use<Feature>.ts）
├── theme/       デザイントークン（colors.ts / spacing.ts）
├── types/       API レスポンス型（api.ts）
├── constants/   config / avatars など
└── utils/       純粋ヘルパ
```

- `services/api.ts` が `EXPO_PUBLIC_API_URL` を読み、Bearer トークンを付与。
  ネットワーク到達不可は `ApiError(0)` → `isConnectionError()`。
- `AuthContext` がセッション（expo-secure-store）とトークンを一元管理。
- `RealtimeProvider` が WebSocket 在席スナップショットを供給。

---

## 5. データモデル（現行）

11 モデル + enum `MemberActivity`。**すべて Postgres に永続化**（`db.md`）。

| モデル | 役割 |
| --- | --- |
| `User` / `Session` / `PasswordResetToken` | 認証・セッション・パスワード再設定 |
| `Onboarding` | **1 ユーザー 1 行**（`userId` PK）。オンボーディング回答 ＋ 設定画面（睡眠スケジュール / 通知トグル / カレンダー連携状態）の保存先。睡眠設定の専用テーブルは作らない |
| `NapRecord` | 仮眠 1 回 = 1 行。生成した `aiAdvice` を同じ行に保存 |
| `NapSession` | 進行中の仮眠（1 ユーザー最大 1 行）。teammate の「あと◯分」カード用 |
| `CalendarEvent` | ユーザーごとの予定。`source` = `manual` / `google`（OAuth なし・サンプル取り込み、`externalId` で洗い替え） |
| `Notification` | 通知フィード（1 行 1 通知）。相対時刻ラベルは読み出し時に導出 |
| `PushToken` | Expo プッシュトークン（デバイスごと、`token @unique`） |
| `Team` / `TeamMembership` | `TeamMembership` は `@@unique([teamId, userId])` かつ `@@unique([userId])`（1 ユーザー 1 チーム） |

---

## 6. まだ静的 / インメモリな箇所

| 箇所 | 現状 |
| --- | --- |
| `realtime/hub.ts` | WebSocket 在席ハブはプロセス内の接続集合。単一インスタンス前提（複数インスタンス / 再起動で失われる） |
| RestRecommendation | 休息提案の履歴・受諾フラグのテーブルは未実装（判定ロジック自体は `rest-decision.service` に存在） |

以前ダミー / インメモリだった **通知フィード・チームサマリー・ランキング・チーム
スコア・チーム統計・メンバー詳細の「あと◯分」・プッシュ通知**はすべて実装済み。
最新の点検結果と残タスクは [implementation-checklist.md](./implementation-checklist.md)。

---

## 7. 詳細ドキュメント

索引は [README.md](./README.md)。

| ドキュメント | 内容 |
| --- | --- |
| [setup.md](./setup.md) | 環境構築・起動・環境変数・トラブルシュート・VPS デプロイ |
| [backend.md](./backend.md) | Backend API の全体像（エンドポイント / リクエストフロー / API フロートレース / 追加手順） |
| [db.md](./db.md) | Prisma スキーマ、ER 図、各テーブルの詳細、マイグレーション一覧 |
| [auth.md](./auth.md) | 認証・セッション・パスワード再設定・オンボーディング |
| [team-feature.md](./team-feature.md) | チーム機能（作成 / 参加 / 在席 / ナッジ / 提案 / WS / メンバー管理 / ライブ仮眠） |
| [settings-architecture.md](./settings-architecture.md) | 設定タブの Screen ↔ hook ↔ API ↔ `Onboarding` 行の対応 |
| [ai-development.md](./ai-development.md) | AI コメント生成（Ollama / Gemma）の構成と編集ポイント |
| [notifications.md](./notifications.md) | 通知フィードの永続化と Expo プッシュ通知 |
| [testing-guide.md](./testing-guide.md) | 機能ごとの手動確認手順 |
| [device-testing.md](./device-testing.md) | iPhone / Android 実機・複数アカウントでのテスト手順 |
| [test-account.md](./test-account.md) | シード投入されるテストアカウントとパスワード |
| [implementation-checklist.md](./implementation-checklist.md) | リポジトリ全体の実装点検チェックリスト |
