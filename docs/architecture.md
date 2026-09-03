# アーキテクチャ概要

Team Nap 全体の構成と、詳細ドキュメントへの地図。個別の設計は末尾の
「詳細ドキュメント」を参照。

---

## 1. システム構成

```text
┌─────────────┐        HTTPS / WSS         ┌──────────────────────────┐
│   Mobile    │  ───────────────────────▶  │        Backend           │
│ Expo (RN)   │   /api/v1/*  (Bearer)      │  Express 5 + TypeScript   │
│ expo-router │  ◀───────────────────────  │  (ESM / NodeNext)         │
└─────────────┘   /api/v1/realtime (WS)    └───────────┬──────────────┘
                                                       │
                              ┌────────────────────────┼────────────────────┐
                              ▼                        ▼                    ▼
                     ┌────────────────┐      ┌──────────────────┐   ┌──────────────┐
                     │  PostgreSQL 17 │      │  Ollama (Gemma)  │   │ (in-memory)  │
                     │  via Prisma 7  │      │  AI コメント生成  │   │ 通知フィード  │
                     │  + adapter-pg  │      │  OLLAMA_URL      │   │ ※永続化予定  │
                     └────────────────┘      └──────────────────┘   └──────────────┘
```

- **Mobile は DB / Ollama に直接触れない**。すべて Backend API 経由。
- Backend は 1 プロセスで HTTP と WebSocket の両方を待ち受ける（`src/server.ts`）。
- Docker Compose では `backend` / `db` / `ollama` / `ollama-pull`（モデル取得の
  ワンショット）の 4 サービス（`compose.yaml`）。

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

`User` / `Session` / `PasswordResetToken` / `Onboarding` / `NapRecord` /
`CalendarEvent` / `Team` / `TeamMembership` ＋ enum `MemberActivity`。

- `Onboarding` は **1 ユーザー 1 行**（`userId` PK）。オンボーディングの回答に
  加えて設定画面（睡眠スケジュール / 通知トグル / カレンダー連携状態）の保存先を
  兼ねる（睡眠設定の専用テーブルは作らない）。
- `NapRecord` は仮眠 1 回 = 1 行。生成した `aiAdvice` を同じ行に保存。
- `CalendarEvent` はユーザーごとの予定。`source` = `manual` / `google`。
  Google 連携（OAuth なし・サンプル取り込み）は `externalId` で洗い替え。
- `TeamMembership` は `@@unique([teamId, userId])` かつ `@@unique([userId])`
  （1 ユーザー 1 チーム）。

詳細は [db.md](./db.md)。

---

## 6. まだ静的 / インメモリな箇所（DB 化・実装の候補）

| 箇所 | 現状 |
| --- | --- |
| `notifications.service.ts` | 通知フィードは `Map`（userId ごと）。**サーバ再起動で消える** |
| `home.service.ts` `homeSnapshot` | チームスコアが固定値 |
| `team.service.ts` `teamSummarySnapshot` / `rankingSnapshot` | 今週サマリー・ランキングが固定ダミー（実メンバーと無関係） |
| `stats.service.ts` `getTeamStats` | チーム統計はゼロ埋め（per-member 集計なし） |
| Push 通知 | 未実装（`expo-notifications` なし）。アプリ起動中のみ通知が届く |
| RestRecommendation | 提案履歴・受諾フラグのテーブルなし |

最新の点検結果と優先度は [implementation-checklist.md](./implementation-checklist.md)。

---

## 7. 詳細ドキュメント

| ドキュメント | 内容 |
| --- | --- |
| [setup.md](./setup.md) | 環境構築・起動手順（Mobile / Backend / Docker）、トラブルシュート |
| [db.md](./db.md) | Prisma スキーマ、ER 図、各テーブルの詳細、マイグレーション一覧 |
| [auth.md](./auth.md) | 認証・セッション・パスワード再設定・オンボーディング（Backend） |
| [team-feature.md](./team-feature.md) | チーム機能のバックエンド設計（作成 / 参加 / 在席 / ナッジ / 提案 / WS） |
| [settings-architecture.md](./settings-architecture.md) | 設定タブの Screen ↔ hook ↔ API ↔ `Onboarding` 行の対応 |
| [ai-development.md](./ai-development.md) | AI コメント機能（Ollama / Gemma）の構成と編集ポイント |
| [testing-guide.md](./testing-guide.md) | 機能ごとの手動確認手順 |
| [test-account.md](./test-account.md) | シード投入されるテストアカウントとパスワード |
| [implementation-checklist.md](./implementation-checklist.md) | リポジトリ全体の実装点検チェックリスト |
